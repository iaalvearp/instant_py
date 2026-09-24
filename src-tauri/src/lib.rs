mod modelos;
mod proyectos;
mod seguridad;
mod slug;

use std::process::Stdio;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

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
        .arg("-")
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