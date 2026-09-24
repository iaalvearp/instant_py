mod modelos;
mod proyectos;
mod seguridad;
mod slug;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn ejecutar_python(codigo: String) -> Result<String, String> {
    use std::process::Stdio;
    use tokio::io::AsyncReadExt;
    use tokio::io::AsyncWriteExt;
    use tokio::process::Command;
    use tokio::time::{timeout, Duration};

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

    let plazo = Duration::from_secs(15);
    let salida = match timeout(plazo, async {
        let _ = escribir_stdin.await;
        (leer_stdout.await, leer_stderr.await)
    })
    .await
    {
        Ok((stdout, stderr)) => {
            let mut texto = stdout.map_err(|e| format!("Error interno al leer salida: {e}"))?;
            let texto_stderr =
                stderr.map_err(|e| format!("Error interno al leer errores: {e}"))?;
            if !texto_stderr.is_empty() {
                if !texto.is_empty() {
                    texto.push('\n');
                }
                texto.push_str(&texto_stderr);
            }
            Ok(texto)
        }
        Err(_) => {
            let _ = hijo.kill().await;
            Err("Tiempo de ejecución superado (máx. 15 s).".to_string())
        }
    };

    salida
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
        .invoke_handler(tauri::generate_handler![
            greet,
            ejecutar_python,
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