// Modelos de datos compartidos entre backend (Rust) y frontend (TypeScript).
// Se serializan a camelCase para que el frontend los consuma tal cual.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Perfil {
    pub nombre: String,
    pub slug: String,
    pub creado_en: String,
    pub pin: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Proyecto {
    pub nombre: String,
    pub slug: String,
    pub creado_en: String,
    pub modificado_en: String,
    pub entrada: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EntradaArbol {
    pub nombre: String,
    pub ruta: String,
    pub es_carpeta: bool,
    pub hijos: Vec<EntradaArbol>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PaqueteInfo {
    pub nombre: String,
    pub version: String,
}