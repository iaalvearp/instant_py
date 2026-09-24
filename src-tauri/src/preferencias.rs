// Comandos Tauri de preferencias del usuario guardadas en disco.
// Por ahora solo guarda la ejecución automática del editor.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};

#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct Preferencias {
    pub ejecucion_automatica: bool,
}

impl Default for Preferencias {
    fn default() -> Self {
        Self {
            ejecucion_automatica: true,
        }
    }
}

fn ruta_preferencias(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo determinar la carpeta de datos: {e}"))?
        .join("preferencias.json"))
}

fn leer_preferencias(app: &AppHandle) -> Result<Preferencias, String> {
    let ruta = ruta_preferencias(app)?;
    if !ruta.exists() {
        return Ok(Preferencias::default());
    }
    let contenido = std::fs::read_to_string(&ruta)
        .map_err(|e| format!("No se pudo leer las preferencias: {e}"))?;
    match serde_json::from_str(&contenido) {
        Ok(preferencias) => Ok(preferencias),
        Err(_) => Ok(Preferencias::default()),
    }
}

#[tauri::command]
pub fn obtener_preferencias(app: AppHandle) -> Result<Preferencias, String> {
    leer_preferencias(&app)
}

#[tauri::command]
pub fn guardar_preferencias(
    app: AppHandle,
    preferencias: Preferencias,
) -> Result<Preferencias, String> {
    let ruta = ruta_preferencias(&app)?;
    if let Some(carpeta) = ruta.parent() {
        std::fs::create_dir_all(carpeta)
            .map_err(|e| format!("No se pudo crear la carpeta de datos: {e}"))?;
    }
    let contenido = serde_json::to_string_pretty(&preferencias)
        .map_err(|e| format!("Error al guardar preferencias: {e}"))?;
    std::fs::write(&ruta, contenido)
        .map_err(|e| format!("No se pudo guardar las preferencias: {e}"))?;
    Ok(preferencias)
}