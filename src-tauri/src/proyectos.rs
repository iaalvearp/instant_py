// Comandos Tauri de gestión de perfiles y proyectos sobre el disco.
// Toda la información vive en app_data_dir/perfiles/{slug}/... y cada ruta
// que llega del frontend pasa antes por seguridad::resolver_ruta_en.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::modelos::{EntradaArbol, Perfil, Proyecto};
use crate::seguridad::{self, validar_slug_identificador};
use crate::slug;

pub const CONTENIDO_MAIN_POR_DEFECTO: &str = "print(\"Hola desde instant_py\")\n";

fn carpeta_datos(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("No se pudo determinar la carpeta de datos: {e}"))
}

fn raiz_perfiles(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(carpeta_datos(app)?.join("perfiles"))
}

fn carpeta_de_perfil(app: &AppHandle, perfil_slug: &str) -> Result<PathBuf, String> {
    comprobar_slug(perfil_slug)?;
    Ok(raiz_perfiles(app)?.join(perfil_slug))
}

pub(crate) fn carpeta_de_proyecto(
    app: &AppHandle,
    perfil_slug: &str,
    proyecto_slug: &str,
) -> Result<PathBuf, String> {
    comprobar_slug(proyecto_slug)?;
    Ok(carpeta_de_perfil(app, perfil_slug)?
        .join("proyectos")
        .join(proyecto_slug))
}

fn comprobar_slug(slug: &str) -> Result<(), String> {
    if validar_slug_identificador(slug) {
        Ok(())
    } else {
        Err(format!("Identificador de ruta no válido: {slug}"))
    }
}

fn ver_perfil_existe(app: &AppHandle, perfil_slug: &str) -> Result<(), String> {
    if !carpeta_de_perfil(app, perfil_slug)?.join("perfil.json").exists() {
        return Err(format!("El perfil '{perfil_slug}' no existe"));
    }
    Ok(())
}

fn ahora_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn mover_a_papelera_o_borrar(ruta: &Path) -> Result<(), String> {
    match trash::delete(ruta) {
        Ok(()) => Ok(()),
        Err(error_papelera) => {
            let resultado = if ruta.is_dir() {
                std::fs::remove_dir_all(ruta)
            } else {
                std::fs::remove_file(ruta)
            };
            resultado.map_err(|e| {
                format!(
                    "No se pudo eliminar (papelera: {error_papelera}; disco: {e})"
                )
            })
        }
    }
}

/// Actualiza la fecha de última modificación del proyecto en su proyecto.json.
fn actualizar_modificacion(
    app: &AppHandle,
    perfil_slug: &str,
    proyecto_slug: &str,
) -> Result<(), String> {
    let ruta_json = carpeta_de_proyecto(app, perfil_slug, proyecto_slug)?.join("proyecto.json");
    if !ruta_json.exists() {
        return Ok(());
    }
    let texto = std::fs::read_to_string(&ruta_json)
        .map_err(|e| format!("No se pudo leer el proyecto: {e}"))?;
    if let Ok(mut proyecto) = serde_json::from_str::<Proyecto>(&texto) {
        proyecto.modificado_en = ahora_iso();
        let contenido = serde_json::to_string_pretty(&proyecto)
            .map_err(|e| format!("No se pudo guardar el proyecto: {e}"))?;
        std::fs::write(&ruta_json, contenido)
            .map_err(|e| format!("No se pudo guardar el proyecto: {e}"))?;
    }
    Ok(())
}

fn construir_arbol(raiz: &Path, relativa: &Path) -> Result<Vec<EntradaArbol>, String> {
    let completa = raiz.join(relativa);
    let mut entradas = Vec::new();
    let lector = std::fs::read_dir(&completa)
        .map_err(|e| format!("No se pudo leer la carpeta del proyecto: {e}"))?;
    for entrada in lector.flatten() {
        let ruta = entrada.path();
        let nombre = match ruta.file_name().and_then(|n| n.to_str()) {
            Some(nombre) => nombre.to_string(),
            None => continue,
        };
        let es_carpeta = ruta.is_dir();
        let ruta_relativa = if relativa.as_os_str().is_empty() {
            PathBuf::from(&nombre)
        } else {
            relativa.join(&nombre)
        };
        let hijos = if es_carpeta {
            construir_arbol(raiz, &ruta_relativa)?
        } else {
            Vec::new()
        };
        entradas.push(EntradaArbol {
            nombre,
            ruta: ruta_relativa.to_string_lossy().replace('\\', "/"),
            es_carpeta,
            hijos,
        });
    }
    // Carpetas primero y después alfabético.
    entradas.sort_by(|a, b| {
        b.es_carpeta
            .cmp(&a.es_carpeta)
            .then_with(|| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()))
    });
    Ok(entradas)
}

#[tauri::command]
pub fn listar_perfiles(app: AppHandle) -> Result<Vec<Perfil>, String> {
    let datos = raiz_perfiles(&app)?;
    if !datos.exists() {
        return Ok(Vec::new());
    }
    let lector = std::fs::read_dir(&datos)
        .map_err(|e| format!("No se pudo leer la carpeta de perfiles: {e}"))?;
    let mut perfiles = Vec::new();
    for entrada in lector.flatten() {
        let carpeta = entrada.path();
        if !carpeta.is_dir() {
            continue;
        }
        let archivo = carpeta.join("perfil.json");
        if let Ok(texto) = std::fs::read_to_string(&archivo) {
            if let Ok(perfil) = serde_json::from_str::<Perfil>(&texto) {
                perfiles.push(perfil);
            }
        }
    }
    perfiles.sort_by(|a, b| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()));
    Ok(perfiles)
}

#[tauri::command]
pub fn crear_perfil(app: AppHandle, nombre: String) -> Result<Perfil, String> {
    let nombre = nombre.trim().to_string();
    if nombre.is_empty() {
        return Err("El nombre del perfil no puede estar vacío".to_string());
    }
    let existentes = listar_perfiles(app.clone())?;
    if existentes
        .iter()
        .any(|p| p.nombre.eq_ignore_ascii_case(&nombre))
    {
        return Err(format!("Ya existe un perfil con el nombre '{nombre}'"));
    }

    let datos = raiz_perfiles(&app)?;
    std::fs::create_dir_all(&datos)
        .map_err(|e| format!("No se pudo crear la carpeta de perfiles: {e}"))?;

    let base = slug::generar_slug(&nombre);
    let slug = slug::slug_unico(&base, |candidato| {
        carpeta_de_perfil(&app, candidato)
            .map(|c| c.exists())
            .unwrap_or(false)
    });

    let carpeta = carpeta_de_perfil(&app, &slug)?;
    std::fs::create_dir_all(&carpeta)
        .map_err(|e| format!("No se pudo crear el perfil: {e}"))?;

    let perfil = Perfil {
        nombre,
        slug,
        creado_en: ahora_iso(),
        pin: None,
    };
    let contenido = serde_json::to_string_pretty(&perfil)
        .map_err(|e| format!("No se pudo guardar el perfil: {e}"))?;
    std::fs::write(carpeta.join("perfil.json"), contenido)
        .map_err(|e| format!("No se pudo guardar el perfil: {e}"))?;
    Ok(perfil)
}

#[tauri::command]
pub fn listar_proyectos(app: AppHandle, perfil_slug: String) -> Result<Vec<Proyecto>, String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta_proyectos = carpeta_de_perfil(&app, &perfil_slug)?.join("proyectos");
    if !carpeta_proyectos.exists() {
        return Ok(Vec::new());
    }
    let lector = std::fs::read_dir(&carpeta_proyectos)
        .map_err(|e| format!("No se pudo leer la carpeta de proyectos: {e}"))?;
    let mut proyectos = Vec::new();
    for entrada in lector.flatten() {
        let carpeta = entrada.path();
        if !carpeta.is_dir() {
            continue;
        }
        let archivo = carpeta.join("proyecto.json");
        if let Ok(texto) = std::fs::read_to_string(&archivo) {
            if let Ok(proyecto) = serde_json::from_str::<Proyecto>(&texto) {
                proyectos.push(proyecto);
            }
        }
    }
    proyectos.sort_by(|a, b| a.nombre.to_lowercase().cmp(&b.nombre.to_lowercase()));
    Ok(proyectos)
}

#[tauri::command]
pub fn crear_proyecto(
    app: AppHandle,
    perfil_slug: String,
    nombre: String,
) -> Result<Proyecto, String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let nombre = nombre.trim().to_string();
    if nombre.is_empty() {
        return Err("El nombre del proyecto no puede estar vacío".to_string());
    }
    let existentes = listar_proyectos(app.clone(), perfil_slug.clone())?;
    if existentes
        .iter()
        .any(|p| p.nombre.eq_ignore_ascii_case(&nombre))
    {
        return Err(format!("Ya existe un proyecto con el nombre '{nombre}'"));
    }

    let base = slug::generar_slug(&nombre);
    let slug = slug::slug_unico(&base, |candidato| {
        carpeta_de_proyecto(&app, &perfil_slug, candidato)
            .map(|c| c.exists())
            .unwrap_or(false)
    });

    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &slug)?;
    std::fs::create_dir_all(&carpeta)
        .map_err(|e| format!("No se pudo crear el proyecto: {e}"))?;

    let ahora = ahora_iso();
    let proyecto = Proyecto {
        nombre,
        slug,
        creado_en: ahora.clone(),
        modificado_en: ahora,
        entrada: "main.py".to_string(),
    };
    let contenido = serde_json::to_string_pretty(&proyecto)
        .map_err(|e| format!("No se pudo guardar el proyecto: {e}"))?;
    std::fs::write(carpeta.join("proyecto.json"), contenido)
        .map_err(|e| format!("No se pudo guardar el proyecto: {e}"))?;
    std::fs::write(carpeta.join("requirements.txt"), "")
        .map_err(|e| format!("No se pudo crear requirements.txt: {e}"))?;
    std::fs::write(carpeta.join("main.py"), CONTENIDO_MAIN_POR_DEFECTO)
        .map_err(|e| format!("No se pudo crear main.py: {e}"))?;
    Ok(proyecto)
}

#[tauri::command]
pub fn eliminar_proyecto(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
) -> Result<(), String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    if carpeta.exists() {
        mover_a_papelera_o_borrar(&carpeta)?;
    }
    Ok(())
}

#[tauri::command]
pub fn listar_archivos(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
) -> Result<Vec<EntradaArbol>, String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    if !carpeta.exists() {
        return Err(format!("El proyecto '{proyecto_slug}' no existe"));
    }
    construir_arbol(&carpeta, Path::new(""))
}

#[tauri::command]
pub fn leer_archivo(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
    ruta_relativa: String,
) -> Result<String, String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    let ruta = seguridad::resolver_ruta_en(&carpeta, &ruta_relativa)?;
    if ruta.is_dir() {
        return Err("Es una carpeta, no un archivo".to_string());
    }
    std::fs::read_to_string(&ruta)
        .map_err(|e| format!("No se pudo leer el archivo: {e}"))
}

#[tauri::command]
pub fn escribir_archivo(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
    ruta_relativa: String,
    contenido: String,
) -> Result<(), String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    let ruta = seguridad::resolver_ruta_en(&carpeta, &ruta_relativa)?;
    if let Some(padre) = ruta.parent() {
        std::fs::create_dir_all(padre)
            .map_err(|e| format!("No se pudieron crear las carpetas intermedias: {e}"))?;
    }
    std::fs::write(&ruta, contenido)
        .map_err(|e| format!("No se pudo guardar el archivo: {e}"))?;
    actualizar_modificacion(&app, &perfil_slug, &proyecto_slug)
}

#[tauri::command]
pub fn crear_archivo(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
    ruta_relativa: String,
) -> Result<(), String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    let ruta = seguridad::resolver_ruta_en(&carpeta, &ruta_relativa)?;
    if ruta.exists() {
        return Err("Ya existe un archivo o carpeta con ese nombre".to_string());
    }
    if let Some(padre) = ruta.parent() {
        std::fs::create_dir_all(padre)
            .map_err(|e| format!("No se pudieron crear las carpetas intermedias: {e}"))?;
    }
    std::fs::write(&ruta, "")
        .map_err(|e| format!("No se pudo crear el archivo: {e}"))?;
    actualizar_modificacion(&app, &perfil_slug, &proyecto_slug)
}

#[tauri::command]
pub fn crear_carpeta(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
    ruta_relativa: String,
) -> Result<(), String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    let ruta = seguridad::resolver_ruta_en(&carpeta, &ruta_relativa)?;
    if ruta.exists() {
        return Err("Ya existe un archivo o carpeta con ese nombre".to_string());
    }
    std::fs::create_dir_all(&ruta)
        .map_err(|e| format!("No se pudo crear la carpeta: {e}"))?;
    actualizar_modificacion(&app, &perfil_slug, &proyecto_slug)
}

#[tauri::command]
pub fn eliminar_entrada(
    app: AppHandle,
    perfil_slug: String,
    proyecto_slug: String,
    ruta_relativa: String,
) -> Result<(), String> {
    ver_perfil_existe(&app, &perfil_slug)?;
    let carpeta = carpeta_de_proyecto(&app, &perfil_slug, &proyecto_slug)?;
    let ruta = seguridad::resolver_ruta_en(&carpeta, &ruta_relativa)?;
    if !ruta.exists() {
        return Err("No existe la entrada indicada".to_string());
    }
    mover_a_papelera_o_borrar(&ruta)?;
    actualizar_modificacion(&app, &perfil_slug, &proyecto_slug)
}