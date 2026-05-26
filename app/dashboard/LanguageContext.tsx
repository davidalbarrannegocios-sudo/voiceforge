"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

export type Lang = "es" | "en" | "fr" | "de" | "pt";

export interface Translations {
  nav: {
    home: string; customVoice: string; generate: string; transcribe: string;
    translate: string; history: string; billing: string; referrals: string;
    account: string; products: string; platform: string; characters: string;
    buy: string; upgradePlan: string; signOut: string;
    [key: string]: string;
  };
  tabs: {
    home: string; generate: string; transcribe: string; translate: string;
    history: string; billing: string; voices: string; referral: string;
    [key: string]: string;
  };
  home: {
    greeting: string; defaultName: string; available: string;
    cardGenerate: string; cardGenerateDesc: string; cardVoices: string;
    cardVoicesDesc: string; cardHistory: string; cardHistoryDesc: string;
    cardTranscribe: string; cardTranscribeDesc: string;
    cardTranslate: string; cardTranslateDesc: string;
    [key: string]: string;
  };
  generate: { [key: string]: string };
  voices: { [key: string]: string };
  account: { [key: string]: string };
  billing: { [key: string]: string };
  landing: { [key: string]: string };
  auth: { [key: string]: string };
  [key: string]: Record<string, string>;
}

const STORAGE_KEY = "elitelabs_lang";

interface LangCtx {
  lang: Lang;
  t: Translations;
  toggle: () => void;
  setLang: (lang: string) => void;
}

const ES: Translations = {
  nav: {
    home: "Inicio", customVoice: "Voz personalizada", generate: "Texto a Voz",
    transcribe: "Audio a Texto", translate: "Traducción de Audio", history: "Historial",
    billing: "Facturación", referrals: "Referidos", account: "Mi cuenta",
    products: "Productos", platform: "Plataforma", characters: "Caracteres",
    buy: "+ Comprar", upgradePlan: "Mejorar plan", signOut: "Cerrar sesión",
  },
  tabs: {
    home: "Inicio", generate: "Texto a Voz", transcribe: "Audio a Texto",
    translate: "Traducción de Audio", history: "Historial", billing: "Facturación",
    voices: "Mis Voces", referral: "Referidos",
  },
  home: {
    greeting: "Hola,", defaultName: "de nuevo", available: "caracteres disponibles",
    cardGenerate: "Texto a Voz", cardGenerateDesc: "Convierte texto en voz natural al instante",
    cardVoices: "Mis Voces", cardVoicesDesc: "Gestiona y clona tus voces personalizadas",
    cardHistory: "Historial", cardHistoryDesc: "Revisa todas tus generaciones anteriores",
    cardTranscribe: "Audio a Texto", cardTranscribeDesc: "Transcribe cualquier audio a texto al instante",
    cardTranslate: "Traducción de Audio", cardTranslateDesc: "Traduce tus audios a otros idiomas automáticamente",
  },
  generate: {
    placeholder: "Escribe el texto a narrar...", generateBtn: "Generar audio", generating: "Generando...",
    settingsTab: "Ajustes", historyTab: "Historial", voiceLabel: "Voz",
    randomVoice: "Voz aleatoria", paidOnly: "Solo en planes de pago",
    paidOnlyLong: "Solo disponible en planes de pago", defaultVoice: "Voz por defecto",
    clonedVoice: "Voz clonada", systemVoice: "Sistema", audioControls: "Controles de audio",
    speed: "Velocidad", volume: "Volumen", normalization: "Normalización",
    preview: "Pre-escuchar", characters: "caracteres", credits: "créditos",
  },
  voices: {
    cloneNew: "Clonar nueva voz", voiceName: "Nombre de la voz", language: "Idioma",
    gender: "Género", male: "Masculino", female: "Femenino", neutral: "Indefinido",
    public: "Pública", private: "Privada", search: "Buscar voces...",
    explore: "Explorar", favorites: "Favoritos", myVoices: "Mis voces clonadas",
    all: "Todas", free: "Gratis", premium: "Premium", play: "Play",
    download: "Descargar", delete: "Eliminar",
  },
  account: {
    title: "Configuración", subtitle: "Gestiona tu perfil y preferencias de seguridad",
    tabProfile: "Perfil", tabSecurity: "Seguridad", email: "Dirección de email",
    name: "Nombre", currentPlan: "Plan actual", profilePhoto: "Foto de perfil",
    photoDesc: "JPG, PNG, máx 5MB", connectedAccounts: "Cuentas conectadas",
    noConnected: "Sin cuentas externas conectadas", managedByGoogle: "Gestionado por Google",
    connected: "Conectado", deleteAccount: "Eliminar cuenta",
    deleteDesc: "Esta acción es permanente e irreversible", updateName: "Actualizar nombre",
    changePhoto: "Cambiar foto", uploading: "Subiendo...", manageSub: "Gestionar suscripción",
    language: "Idioma de la interfaz", languageDesc: "Cambia el idioma de la web",
    twoFactor: "Autenticación de dos factores (2FA)",
    twoFactorDesc: "Añade una capa extra de seguridad a tu cuenta", comingSoon: "Próximamente",
    save: "Guardar", cancel: "Cancelar", saving: "Guardando...", saved: "✓ Guardado",
    firstName: "Nombre", lastName: "Apellidos", password: "Contraseña",
    currentPassword: "Contraseña actual", newPassword: "Nueva contraseña",
    confirmPassword: "Confirmar contraseña", changePassword: "Cambiar contraseña",
    googleAuth: "Tu cuenta usa Google para autenticarse. No es necesario gestionar una contraseña.",
    deleteConfirmText: "Esta acción es permanente e irreversible. Se eliminarán todos tus datos, voces e historial.",
    deleteConfirmLabel: "Escribe ELIMINAR para confirmar:", deleteConfirmPlaceholder: "ELIMINAR",
    deleteConfirmWord: "ELIMINAR", deleteBtn: "Eliminar mi cuenta", deleting: "Eliminando...",
    passwordError: "Error al cambiar la contraseña", passwordSuccess: "✓ Contraseña actualizada",
    passwordMismatch: "Las contraseñas no coinciden", passwordTooShort: "La contraseña debe tener al menos 8 caracteres",
  },
  billing: {
    subscription: "Suscripción", nextRenewal: "Próxima renovación", nextRecharge: "Próxima recarga",
    availableChars: "Caracteres disponibles", manageSub: "Gestionar suscripción",
    monthly: "Mensual", annual: "Anual", currentPlan: "Plan actual", upgrade: "Mejorar",
  },
  landing: {
    word1: "Genera.", word2: "Clona.", word3: "Domina.",
    subheadline: "Clonación de voz, biblioteca de voces, narraciones y mucho más",
    signIn: "Iniciar sesión", startFree: "Empezar gratis", dashboard: "Dashboard",
    products: "Productos", company: "Empresa", pricing: "Precios",
    textToSpeech: "Texto a voz", voiceCloning: "Clonación de voz", speechToText: "De voz a texto",
    generatePlay: "Generar y reproducir", goToDashboard: "Ir al Dashboard",
  },
  auth: {
    welcome: "Bienvenido de nuevo", signInSubtitle: "Inicia sesión en tu cuenta",
    continueWithGoogle: "Continuar con Google", email: "Email", password: "Contraseña",
    signIn: "Iniciar sesión", createAccount: "Crear cuenta",
    noAccount: "¿No tienes cuenta? Regístrate gratis", haveAccount: "¿Ya tienes cuenta? Inicia sesión",
  },
};

const LanguageContext = createContext<LangCtx>({
  lang: "es", t: ES, toggle: () => {}, setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && (["es", "en", "fr", "de", "pt"] as string[]).includes(stored)) {
      setLangState(stored);
    }
  }, []);

  const setLang = useCallback((l: string) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l as Lang);
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "es" ? "en" : "es");
  }, [lang, setLang]);

  return (
    <LanguageContext.Provider value={{ lang, t: ES, toggle, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LangCtx {
  return useContext(LanguageContext);
}
