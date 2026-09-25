mod modelos;
mod preferencias;
mod proyectos;
mod seguridad;
mod slug;

use std::process::Stdio;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

// Instrumentador Python embebido en el binario: auto-loguea las expresiones a
// nivel de módulo y marca los errores de sintaxis (ver recursos/instrumentador.py).
const INSTRUMENTADOR: &str = include_str!("../../recursos/instrumentador.py");

// Resultado de una ejecución, con salida (stdout/stderr) y cómo terminó.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ResultadoEjecucion {
    salida: String,
    codigo_salida: Option<i32>,
    tiempo_excedido: bool,
    detenido: bool,
}

// Estado compartido para cancelar la ejecución en curso.
// Cada ejecución guarda aquí un canal de cancelación; la siguiente ejecución
// reemplaza el canal, lo que cancela (detiene) la anterior.
#[derive(Default)]
struct Ejecutor {
    cancelador: tokio::sync::Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn ejecutar_python(
    codigo: String,
    estado: tauri::State<'_, Ejecutor>,
) -> Result<ResultadoEjecucion, String> {
    use tokio::time::{sleep, Duration};

    // Cancela la ejecución previa (si existe) y crea el nuevo token de cancelación.
    let receptor = {
        let (enviador, receptor) = tokio::sync::oneshot::channel();
        let mut cancelador = estado.cancelador.lock().await;
        *cancelador = Some(enviador);
        receptor
    };

    let mut hijo = Command::new(sistema_python())
        .arg("-c")
        .arg(INSTRUMENTADOR)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("No se pudo lanzar Python: {e}"))?;

    let mut entrada = hijo.stdin.take().ok_or("No se pudo abrir stdin de Python")?;
    let mut stdout_lectura = hijo.stdout.take().ok_or("No se pudo abrir stdout de Python")?;
    let mut stderr_lectura = hijo.stderr.take().ok_or("No se pudo abrir stderr de Python")?;

    let escribir_stdin = tokio::spawn(async move {
        let _ = entrada.write_all(codigo.as_bytes()).await;
    });
    let leer_stdout = tokio::spawn(async move {
        let mut texto = String::new();
        let _ = stdout_lectura.read_to_string(&mut texto).await;
        texto
    });
    let leer_stderr = tokio::spawn(async move {
        let mut texto = String::new();
        let _ = stderr_lectura.read_to_string(&mut texto).await;
        texto
    });

    let hijo = Arc::new(tokio::sync::Mutex::new(hijo));

    // Ramificación: la ejecución terminó sola (salida leída + proceso esperado).
    let completado = {
        let hijo = Arc::clone(&hijo);
        async move {
            let _ = escribir_stdin.await;
            let (stdout, stderr) = tokio::join!(leer_stdout, leer_stderr);
            let mut texto = stdout.map_err(|e| format!("Error interno al leer salida: {e}"))?;
            let texto_stderr =
                stderr.map_err(|e| format!("Error interno al leer errores: {e}"))?;
            if !texto_stderr.is_empty() {
                if !texto.is_empty() {
                    texto.push('\n');
                }
                texto.push_str(&texto_stderr);
            }
            let codigo = hijo
                .lock()
                .await
                .wait()
                .await
                .map_err(|e| format!("Error al esperar a Python: {e}"))?
                .code();
            Ok::<ResultadoEjecucion, String>(ResultadoEjecucion {
                salida: texto,
                codigo_salida: codigo,
                tiempo_excedido: false,
                detenido: false,
            })
        }
    };

    // Paras y recoges el proceso para no dejar procesos huérfanos.
    let cancelado = {
        let hijo = Arc::clone(&hijo);
        async move {
            let mut hijo = hijo.lock().await;
            let _ = hijo.kill().await;
            let _ = hijo.wait().await;
            ResultadoEjecucion {
                salida: String::new(),
                codigo_salida: None,
                tiempo_excedido: false,
                detenido: true,
            }
        }
    };

    let vencido = {
        let hijo = Arc::clone(&hijo);
        async move {
            let mut hijo = hijo.lock().await;
            let _ = hijo.kill().await;
            let _ = hijo.wait().await;
            ResultadoEjecucion {
                salida: String::new(),
                codigo_salida: None,
                tiempo_excedido: true,
                detenido: false,
            }
        }
    };

    let mut receptor_cancelacion = receptor;
    tokio::select! {
        _ = &mut receptor_cancelacion => Ok(cancelado.await),
        resultado = completado => resultado,
        _ = sleep(Duration::from_secs(15)) => Ok(vencido.await),
    }
}

#[tauri::command]
async fn detener_ejecucion(estado: tauri::State<'_, Ejecutor>) -> Result<(), String> {
    let mut cancelador = estado.cancelador.lock().await;
    if let Some(enviador) = cancelador.take() {
        let _ = enviador.send(());
    }
    Ok(())
}

fn sistema_python() -> &'static str {
    if cfg!(target_os = "windows") {
        "python"
    } else {
        "python3"
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Ejecutor::default())
        .invoke_handler(tauri::generate_handler![
            greet,
            ejecutar_python,
            detener_ejecucion,
            preferencias::obtener_preferencias,
            preferencias::guardar_preferencias,
            proyectos::listar_perfiles,
            proyectos::crear_perfil,
            proyectos::listar_proyectos,
            proyectos::crear_proyecto,
            proyectos::eliminar_proyecto,
            proyectos::listar_archivos,
            proyectos::leer_archivo,
            proyectos::escribir_archivo,
            proyectos::crear_archivo,
            proyectos::crear_carpeta,
            proyectos::eliminar_entrada,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{INSTRUMENTADOR, sistema_python};
    use std::io::Write;
    use std::process::{Command, Stdio};

    fn ejecutar_instrumentado(codigo: &str) -> (String, String, Option<i32>) {
        let mut hijo = Command::new(sistema_python())
            .arg("-c")
            .arg(INSTRUMENTADOR)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("no se pudo lanzar python3");
        hijo
            .stdin
            .take()
            .expect("sin stdin en el proceso")
            .write_all(codigo.as_bytes())
            .expect("no se pudo escribir el código en el proceso");
        let salida = hijo.wait_with_output().expect("no se pudo leer la salida");
        (
            String::from_utf8_lossy(&salida.stdout).into_owned(),
            String::from_utf8_lossy(&salida.stderr).into_owned(),
            salida.status.code(),
        )
    }

    #[test]
    fn autolog_de_artimetica_simple() {
        let (stdout, _, codigo) = ejecutar_instrumentado("2 + 3\n");
        assert_eq!(codigo, Some(0));
        assert!(stdout.contains("__AUTOLOG__:1:5"));
    }

    #[test]
    fn autolog_de_llamadas() {
        let (stdout, _, _) = ejecutar_instrumentado("len([1,2,3])\n");
        assert!(stdout.contains("__AUTOLOG__:1:3"));
    }

    #[test]
    fn autolog_de_textos_con_repr() {
        let (stdout, _, _) = ejecutar_instrumentado("\"texto\"\n");
        assert!(stdout.contains("__AUTOLOG__:1:'texto'"));
    }

    #[test]
    fn sin_autolog_en_asignaciones_imports_y_definiciones() {
        let (stdout, _, _) =
            ejecutar_instrumentado("x = 5\ndef f():\n    return 1\nimport math\n");
        assert!(!stdout.contains("__AUTOLOG__"));
    }

    #[test]
    fn print_normal_sin_estilo_de_autolog() {
        let (stdout, _, _) = ejecutar_instrumentado("print(\"hola\")\n");
        assert!(stdout.contains("hola"));
        assert!(!stdout.contains("__AUTOLOG__"));
    }

    #[test]
    fn docstring_del_modulo_no_se_imprime() {
        let (stdout, _, codigo) = ejecutar_instrumentado("\"\"\"Hola\"\"\"\n");
        assert_eq!(codigo, Some(0));
        assert!(!stdout.contains("__AUTOLOG__"));
        assert!(!stdout.contains("Hola"));
    }

    #[test]
    fn autolog_en_if_for_y_while_a_nivel_de_modulo() {
        let (stdout, _, _) = ejecutar_instrumentado("if True:\n    1 + 2\n");
        assert!(stdout.contains("__AUTOLOG__:2:3"));
        let (stdout, _, _) = ejecutar_instrumentado("for i in range(2):\n    i\n");
        assert!(stdout.contains("__AUTOLOG__:2:0"));
        assert!(stdout.contains("__AUTOLOG__:2:1"));
        let (stdout, _, _) = ejecutar_instrumentado("contador = 0\nwhile contador < 1:\n    contador = contador + 1\n    contador\n");
        assert!(stdout.contains("__AUTOLOG__:4:1"));
    }

    #[test]
    fn sin_autolog_dentro_de_funciones_y_clases() {
        let (stdout, _, _) = ejecutar_instrumentado(
            "def f():\n    1 + 2\n    return 1\nclass A:\n    v = 1 + 2\nf()\n",
        );
        assert!(stdout.contains("__AUTOLOG__:6:1"));
        assert!(!stdout.contains("__AUTOLOG__:2"));
        assert!(!stdout.contains("__AUTOLOG__:5"));
        let (stdout, _, _) = ejecutar_instrumentado("def f():\n    1 + 2\n");
        assert!(!stdout.contains("__AUTOLOG__"));
    }

    #[test]
    fn error_de_sintaxis_marcado_y_estado_de_salida_1() {
        let (stdout, stderr, codigo) = ejecutar_instrumentado("1 +\n");
        assert_eq!(stdout, "");
        assert_eq!(codigo, Some(1));
        assert!(stderr.starts_with("__SYNTAX_ERROR__:1:"));
    }
}