// Comandos Tauri de gestión de paquetes pip con un entorno virtual compartido
// (app_data_dir/venv) y un requirements.txt por proyecto. Los comandos pip se
// lanzan siempre por nombre (sin shell) y los nombres entrantes se validan
// para impedir inyección de comandos. Los conflictos de versión entre los
// requirements y el venv se resolverán en un paso posterior con venvs aislados
// por proyecto.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};
use tokio::process::Command;

use crate::modelos::PaqueteInfo;
use crate::proyectos::carpeta_de_proyecto;

/// Carpeta del entorno virtual compartido por todos los proyectos.
pub fn ruta_venv(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo determinar la carpeta de datos: {e}"))?
        .join("venv"))
}

/// Intérprete de Python del entorno virtual compartido.
pub fn ruta_python_venv(app: &AppHandle) -> Result<PathBuf, String> {
    let venv = ruta_venv(app)?;
    Ok(if cfg!(windows) {
        venv.join("Scripts").join("python.exe")
    } else {
        venv.join("bin").join("python")
    })
}

fn ruta_pip_venv(app: &AppHandle) -> Result<PathBuf, String> {
    let venv = ruta_venv(app)?;
    Ok(if cfg!(windows) {
        venv.join("Scripts").join("pip.exe")
    } else {
        venv.join("bin").join("pip")
    })
}

/// Crea el entorno virtual la primera vez que hace falta (idempotente).
/// Comprueba que exista pip (no solo el ejecutable de Python) para que una
/// creación a medias —por ejemplo interrumpida— se complete en la siguiente
/// llamada en lugar de fallar al lanzar pip.
pub fn inicializar_venv(app: &AppHandle) -> Result<(), String> {
    let pip = ruta_pip_venv(app)?;
    if pip.exists() {
        return Ok(());
    }
    let venv = ruta_venv(app)?;
    let venv_texto = venv
        .to_str()
        .ok_or("La ruta del entorno virtual no es texto válido")?;
    let salida = std::process::Command::new(crate::sistema_python())
        .arg("-m")
        .arg("venv")
        .arg(venv_texto)
        .output()
        .map_err(|e| format!("No se pudo crear el entorno virtual: {e}"))?;
    if !salida.status.success() {
        // Si otro proceso acaba de crear el venv, lo damos por listo.
        if pip.exists() {
            return Ok(());
        }
        let detalle = String::from_utf8_lossy(&salida.stderr);
        return Err(format!(
            "No se pudo crear el entorno virtual:\n{}",
            detalle.trim_end()
        ));
    }
    if !pip.exists() {
        let detalle = String::from_utf8_lossy(&salida.stderr);
        return Err(format!(
            "El entorno virtual se creó pero no quedó listo pip:\n{}",
            detalle.trim_end()
        ));
    }
    Ok(())
}

/// Valida que un nombre de paquete solo contenga letras, números y los
/// caracteres permitidos por pip (punto, guion, guion bajo y '=' para fijar
/// versiones). Rechaza cualquier carácter de shell.
fn validar_nombre_paquete(nombre: &str) -> bool {
    let mut caracteres = nombre.chars();
    let Some(primero) = caracteres.next() else {
        return false;
    };
    if !primero.is_ascii_alphanumeric() {
        return false;
    }
    caracteres.all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | '='))
}

/// Nombre de la dependencia sin versiones ni extras
/// ("numpy==1.26.0" -> "numpy").
fn nombre_base_requisito(requisito: &str) -> &str {
    let recortado = requisito.trim();
    recortado
        .find(|c: char| matches!(c, '=' | '>' | '<' | '!' | '~' | '['))
        .map_or(recortado, |indice| &recortado[..indice])
        .trim()
}

/// Ejecuta pip en el venv y devuelve el texto de salida (o el stderr si
/// stdout está vacío). Falla con un mensaje claro cuando pip no termina bien.
async fn ejecutar_pip(app: &AppHandle, argumentos: &[&str]) -> Result<String, String> {
    inicializar_venv(app)?;
    let pip = ruta_pip_venv(app)?;
    let salida = Command::new(&pip)
        .args(argumentos)
        .output()
        .await
        .map_err(|e| format!("No se pudo ejecutar pip: {e}"))?;
    let stdout = String::from_utf8_lossy(&salida.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&salida.stderr).trim().to_string();
    if salida.status.success() {
        if stderr.is_empty() {
            Ok(stdout)
        } else if stdout.is_empty() {
            Ok(stderr)
        } else {
            Ok(format!("{stdout}\n{stderr}"))
        }
    } else {
        let detalle = if stderr.is_empty() { stdout } else { stderr };
        Err(format!("pip falló:\n{}", detalle.trim_end()))
    }
}

#[derive(serde::Deserialize)]
struct PaqueteEnPipList {
    name: String,
    version: String,
}

async fn listar_paquetes_instalados_interno(
    app: &AppHandle,
) -> Result<Vec<PaqueteInfo>, String> {
    inicializar_venv(app)?;
    let pip = ruta_pip_venv(app)?;
    let salida = Command::new(&pip)
        .args(["list", "--format=json"])
        .output()
        .await
        .map_err(|e| format!("No se pudo listar los paquetes: {e}"))?;
    if !salida.status.success() {
        return Err(format!(
            "pip falló al listar:\n{}",
            String::from_utf8_lossy(&salida.stderr).trim_end()
        ));
    }
    let lista: Vec<PaqueteEnPipList> = serde_json::from_slice(&salida.stdout)
        .map_err(|e| format!("No se pudo interpretar la lista de pip: {e}"))?;
    Ok(lista
        .into_iter()
        .map(|p| PaqueteInfo {
            nombre: p.name,
            version: p.version,
        })
        .collect())
}

fn ruta_requirements(
    app: &AppHandle,
    perfil_slug: &str,
    proyecto_slug: &str,
) -> Result<PathBuf, String> {
    Ok(carpeta_de_proyecto(app, perfil_slug, proyecto_slug)?.join("requirements.txt"))
}

fn leer_requirements_desde(ruta: &Path) -> Result<Vec<String>, String> {
    if !ruta.exists() {
        return Ok(Vec::new());
    }
    let contenido = std::fs::read_to_string(ruta)
        .map_err(|e| format!("No se pudo leer requirements.txt: {e}"))?;
    Ok(contenido
        .lines()
        .map(str::trim)
        .filter(|linea| !linea.is_empty() && !linea.starts_with('#'))
        .map(str::to_string)
        .collect())
}

fn escribir_requirements_en(ruta: &Path, paquetes: &[String]) -> Result<(), String> {
    let mut limpios: Vec<&str> = paquetes
        .iter()
        .map(String::as_str)
        .map(str::trim)
        .filter(|p| !p.is_empty())
        .collect();
    limpios.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    let contenido = if limpios.is_empty() {
        String::new()
    } else {
        format!("{}\n", limpios.join("\n"))
    };
    if let Some(padre) = ruta.parent() {
        std::fs::create_dir_all(padre)
            .map_err(|e| format!("No se pudo preparar la carpeta de requirements.txt: {e}"))?;
    }
    std::fs::write(ruta, contenido).map_err(|e| format!("No se pudo escribir requirements.txt: {e}"))
}

#[tauri::command]
pub fn inicializar_venv_compartido(app: AppHandle) -> Result<(), String> {
    inicializar_venv(&app)
}

#[tauri::command]
pub async fn listar_paquetes_instalados(app: AppHandle) -> Result<Vec<PaqueteInfo>, String> {
    inicializar_venv(&app)?;
    listar_paquetes_instalados_interno(&app).await
}

#[tauri::command]
pub async fn instalar_paquete(app: AppHandle, nombre: String) -> Result<String, String> {
    inicializar_venv(&app)?;
    if !validar_nombre_paquete(&nombre) {
        return Err(format!("Nombre de paquete inválido: {nombre}"));
    }
    ejecutar_pip(&app, &["install", &nombre]).await
}

#[tauri::command]
pub async fn desinstalar_paquete(app: AppHandle, nombre: String) -> Result<String, String> {
    inicializar_venv(&app)?;
    if !validar_nombre_paquete(&nombre) {
        return Err(format!("Nombre de paquete inválido: {nombre}"));
    }
    ejecutar_pip(&app, &["uninstall", "-y", &nombre]).await
}

#[tauri::command]
pub fn leer_requirements(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
) -> Result<Vec<String>, String> {
    let ruta = ruta_requirements(&app, &perfil_slug, &proyecto_slug)?;
    leer_requirements_desde(&ruta)
}

#[tauri::command]
pub fn escribir_requirements(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
    paquetes: Vec<String>,
) -> Result<(), String> {
    let ruta = ruta_requirements(&app, &perfil_slug, &proyecto_slug)?;
    escribir_requirements_en(&ruta, &paquetes)
}

/// Instala los paquetes del requirements.txt que aún no están en el venv.
#[tauri::command]
pub async fn sincronizar_requirements(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
) -> Result<(), String> {
    inicializar_venv(&app)?;
    let ruta = ruta_requirements(&app, &perfil_slug, &proyecto_slug)?;
    let requisitos = leer_requirements_desde(&ruta)?;
    let instalados = listar_paquetes_instalados_interno(&app).await?;
    let por_instalar: Vec<String> = requisitos
        .into_iter()
        .filter(|requisito| {
            let base = nombre_base_requisito(requisito);
            !instalados
                .iter()
                .any(|p| p.nombre.eq_ignore_ascii_case(base))
        })
        .collect();
    for requisito in &por_instalar {
        ejecutar_pip(&app, &["install", requisito])
            .await
            .map_err(|e| format!("No se pudo instalar '{requisito}': {e}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        escribir_requirements_en, leer_requirements_desde, nombre_base_requisito,
        validar_nombre_paquete,
    };

    #[test]
    fn nombres_de_paquete_validos() {
        assert!(validar_nombre_paquete("rich"));
        assert!(validar_nombre_paquete("numpy==1.26.0"));
        assert!(validar_nombre_paquete("django-peewee"));
        assert!(validar_nombre_paquete("requests_oauthlib"));
    }

    #[test]
    fn nombres_de_paquete_invalidos() {
        assert!(!validar_nombre_paquete(""));
        assert!(!validar_nombre_paquete("rich; rm -rf /"));
        assert!(!validar_nombre_paquete("rich && echo hola"));
        assert!(!validar_nombre_paquete("$(id)"));
        assert!(!validar_nombre_paquete("-rich"));
        assert!(!validar_nombre_paquete("rich --summary"));
    }

    #[test]
    fn base_de_requisito_sin_version() {
        assert_eq!(nombre_base_requisito("numpy==1.26.0"), "numpy");
        assert_eq!(nombre_base_requisito("rich"), "rich");
        assert_eq!(nombre_base_requisito("requests[security]>=2.0"), "requests");
        assert_eq!(nombre_base_requisito("  black  "), "black");
    }

    #[test]
    fn requirements_se_ordenan_sin_distinguir_mayusculas() {
        let ruta = std::env::temp_dir().join(format!(
            "instant_py_orden_{}.txt",
            std::process::id()
        ));
        escribir_requirements_en(
            &ruta,
            &[
                "Boto3".to_string(),
                "rich".to_string(),
                "  ".to_string(),
                "botocore".to_string(),
            ],
        )
        .unwrap();
        let leidas = leer_requirements_desde(&ruta).unwrap();
        assert_eq!(leidas, vec!["Boto3", "botocore", "rich"]);
        let _ = std::fs::remove_file(&ruta);
    }

    #[test]
    fn requirements_ignoran_vacios_y_comentarios() {
        let ruta = std::env::temp_dir().join(format!(
            "instant_py_comentarios_{}.txt",
            std::process::id()
        ));
        std::fs::write(&ruta, "# comentario\n\nrich\n# otro\n").unwrap();
        let leidas = leer_requirements_desde(&ruta).unwrap();
        assert_eq!(leidas, vec!["rich"]);
        let _ = std::fs::remove_file(&ruta);
    }
}