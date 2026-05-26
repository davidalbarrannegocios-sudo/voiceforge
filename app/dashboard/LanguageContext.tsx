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
const VALID_LANGS: Lang[] = ["es", "en", "fr", "de", "pt"];

interface LangCtx {
  lang: Lang;
  t: Translations;
  toggle: () => void;
  setLang: (lang: string) => void;
}

// ─── Spanish ───────────────────────────────────────────────────────────────
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

// ─── English ───────────────────────────────────────────────────────────────
const EN: Translations = {
  nav: {
    home: "Home", customVoice: "Custom Voice", generate: "Text to Speech",
    transcribe: "Audio to Text", translate: "Audio Translation", history: "History",
    billing: "Billing", referrals: "Referrals", account: "My Account",
    products: "Products", platform: "Platform", characters: "Characters",
    buy: "+ Buy", upgradePlan: "Upgrade plan", signOut: "Sign out",
  },
  tabs: {
    home: "Home", generate: "Text to Speech", transcribe: "Audio to Text",
    translate: "Audio Translation", history: "History", billing: "Billing",
    voices: "My Voices", referral: "Referrals",
  },
  home: {
    greeting: "Hello,", defaultName: "again", available: "characters available",
    cardGenerate: "Text to Speech", cardGenerateDesc: "Convert text to natural voice instantly",
    cardVoices: "My Voices", cardVoicesDesc: "Manage and clone your custom voices",
    cardHistory: "History", cardHistoryDesc: "Review all your previous generations",
    cardTranscribe: "Audio to Text", cardTranscribeDesc: "Transcribe any audio to text instantly",
    cardTranslate: "Audio Translation", cardTranslateDesc: "Translate your audio to other languages automatically",
  },
  generate: {
    placeholder: "Write the text to narrate...", generateBtn: "Generate audio", generating: "Generating...",
    settingsTab: "Settings", historyTab: "History", voiceLabel: "Voice",
    randomVoice: "Random voice", paidOnly: "Paid plans only",
    paidOnlyLong: "Only available on paid plans", defaultVoice: "Default voice",
    clonedVoice: "Cloned voice", systemVoice: "System", audioControls: "Audio controls",
    speed: "Speed", volume: "Volume", normalization: "Normalization",
    preview: "Preview", characters: "characters", credits: "credits",
  },
  voices: {
    cloneNew: "Clone new voice", voiceName: "Voice name", language: "Language",
    gender: "Gender", male: "Male", female: "Female", neutral: "Neutral",
    public: "Public", private: "Private", search: "Search voices...",
    explore: "Explore", favorites: "Favorites", myVoices: "My cloned voices",
    all: "All", free: "Free", premium: "Premium", play: "Play",
    download: "Download", delete: "Delete",
  },
  account: {
    title: "Settings", subtitle: "Manage your profile and security preferences",
    tabProfile: "Profile", tabSecurity: "Security", email: "Email address",
    name: "Name", currentPlan: "Current plan", profilePhoto: "Profile photo",
    photoDesc: "JPG, PNG, max 5MB", connectedAccounts: "Connected accounts",
    noConnected: "No external accounts connected", managedByGoogle: "Managed by Google",
    connected: "Connected", deleteAccount: "Delete account",
    deleteDesc: "This action is permanent and irreversible", updateName: "Update name",
    changePhoto: "Change photo", uploading: "Uploading...", manageSub: "Manage subscription",
    language: "Interface language", languageDesc: "Change the website language",
    twoFactor: "Two-factor authentication (2FA)",
    twoFactorDesc: "Add an extra layer of security to your account", comingSoon: "Coming soon",
    save: "Save", cancel: "Cancel", saving: "Saving...", saved: "✓ Saved",
    firstName: "First name", lastName: "Last name", password: "Password",
    currentPassword: "Current password", newPassword: "New password",
    confirmPassword: "Confirm password", changePassword: "Change password",
    googleAuth: "Your account uses Google to authenticate. No need to manage a password.",
    deleteConfirmText: "This action is permanent and irreversible. All your data, voices and history will be deleted.",
    deleteConfirmLabel: "Type DELETE to confirm:", deleteConfirmPlaceholder: "DELETE",
    deleteConfirmWord: "DELETE", deleteBtn: "Delete my account", deleting: "Deleting...",
    passwordError: "Error changing password", passwordSuccess: "✓ Password updated",
    passwordMismatch: "Passwords don't match", passwordTooShort: "Password must be at least 8 characters",
  },
  billing: {
    subscription: "Subscription", nextRenewal: "Next renewal", nextRecharge: "Next recharge",
    availableChars: "Available characters", manageSub: "Manage subscription",
    monthly: "Monthly", annual: "Annual", currentPlan: "Current plan", upgrade: "Upgrade",
  },
  landing: {
    word1: "Generate.", word2: "Clone.", word3: "Dominate.",
    subheadline: "Voice cloning, voice library, narrations and much more",
    signIn: "Sign in", startFree: "Start free", dashboard: "Dashboard",
    products: "Products", company: "Company", pricing: "Pricing",
    textToSpeech: "Text to speech", voiceCloning: "Voice cloning", speechToText: "Speech to text",
    generatePlay: "Generate and play", goToDashboard: "Go to Dashboard",
  },
  auth: {
    welcome: "Welcome back", signInSubtitle: "Sign in to your account",
    continueWithGoogle: "Continue with Google", email: "Email", password: "Password",
    signIn: "Sign in", createAccount: "Create account",
    noAccount: "Don't have an account? Sign up free", haveAccount: "Already have an account? Sign in",
  },
};

// ─── French ────────────────────────────────────────────────────────────────
const FR: Translations = {
  nav: {
    home: "Accueil", customVoice: "Voix personnalisée", generate: "Texte en voix",
    transcribe: "Audio en texte", translate: "Traduction audio", history: "Historique",
    billing: "Facturation", referrals: "Parrainages", account: "Mon compte",
    products: "Produits", platform: "Plateforme", characters: "Caractères",
    buy: "+ Acheter", upgradePlan: "Améliorer le plan", signOut: "Déconnexion",
  },
  tabs: {
    home: "Accueil", generate: "Texte en voix", transcribe: "Audio en texte",
    translate: "Traduction audio", history: "Historique", billing: "Facturation",
    voices: "Mes voix", referral: "Parrainages",
  },
  home: {
    greeting: "Bonjour,", defaultName: "de nouveau", available: "caractères disponibles",
    cardGenerate: "Texte en voix", cardGenerateDesc: "Convertissez du texte en voix naturelle instantanément",
    cardVoices: "Mes voix", cardVoicesDesc: "Gérez et clonez vos voix personnalisées",
    cardHistory: "Historique", cardHistoryDesc: "Consultez toutes vos générations précédentes",
    cardTranscribe: "Audio en texte", cardTranscribeDesc: "Transcrivez n'importe quel audio en texte instantanément",
    cardTranslate: "Traduction audio", cardTranslateDesc: "Traduisez vos audios dans d'autres langues automatiquement",
  },
  generate: {
    placeholder: "Écrivez le texte à narrer...", generateBtn: "Générer audio", generating: "Génération...",
    settingsTab: "Paramètres", historyTab: "Historique", voiceLabel: "Voix",
    randomVoice: "Voix aléatoire", paidOnly: "Plans payants uniquement",
    paidOnlyLong: "Uniquement disponible sur les plans payants", defaultVoice: "Voix par défaut",
    clonedVoice: "Voix clonée", systemVoice: "Système", audioControls: "Contrôles audio",
    speed: "Vitesse", volume: "Volume", normalization: "Normalisation",
    preview: "Prévisualiser", characters: "caractères", credits: "crédits",
  },
  voices: {
    cloneNew: "Cloner une nouvelle voix", voiceName: "Nom de la voix", language: "Langue",
    gender: "Genre", male: "Masculin", female: "Féminin", neutral: "Neutre",
    public: "Publique", private: "Privée", search: "Rechercher des voix...",
    explore: "Explorer", favorites: "Favoris", myVoices: "Mes voix clonées",
    all: "Toutes", free: "Gratuit", premium: "Premium", play: "Lire",
    download: "Télécharger", delete: "Supprimer",
  },
  account: {
    title: "Paramètres", subtitle: "Gérez votre profil et vos préférences de sécurité",
    tabProfile: "Profil", tabSecurity: "Sécurité", email: "Adresse e-mail",
    name: "Nom", currentPlan: "Plan actuel", profilePhoto: "Photo de profil",
    photoDesc: "JPG, PNG, max 5 Mo", connectedAccounts: "Comptes connectés",
    noConnected: "Aucun compte externe connecté", managedByGoogle: "Géré par Google",
    connected: "Connecté", deleteAccount: "Supprimer le compte",
    deleteDesc: "Cette action est permanente et irréversible", updateName: "Mettre à jour le nom",
    changePhoto: "Changer la photo", uploading: "Envoi en cours...", manageSub: "Gérer l'abonnement",
    language: "Langue de l'interface", languageDesc: "Changer la langue du site",
    twoFactor: "Authentification à deux facteurs (2FA)",
    twoFactorDesc: "Ajoutez une couche de sécurité supplémentaire à votre compte", comingSoon: "Bientôt disponible",
    save: "Enregistrer", cancel: "Annuler", saving: "Enregistrement...", saved: "✓ Enregistré",
    firstName: "Prénom", lastName: "Nom de famille", password: "Mot de passe",
    currentPassword: "Mot de passe actuel", newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe", changePassword: "Changer le mot de passe",
    googleAuth: "Votre compte utilise Google pour s'authentifier. Pas besoin de gérer un mot de passe.",
    deleteConfirmText: "Cette action est permanente et irréversible. Toutes vos données, voix et historique seront supprimés.",
    deleteConfirmLabel: "Tapez SUPPRIMER pour confirmer:", deleteConfirmPlaceholder: "SUPPRIMER",
    deleteConfirmWord: "SUPPRIMER", deleteBtn: "Supprimer mon compte", deleting: "Suppression...",
    passwordError: "Erreur lors du changement de mot de passe", passwordSuccess: "✓ Mot de passe mis à jour",
    passwordMismatch: "Les mots de passe ne correspondent pas", passwordTooShort: "Le mot de passe doit comporter au moins 8 caractères",
  },
  billing: {
    subscription: "Abonnement", nextRenewal: "Prochain renouvellement", nextRecharge: "Prochain rechargement",
    availableChars: "Caractères disponibles", manageSub: "Gérer l'abonnement",
    monthly: "Mensuel", annual: "Annuel", currentPlan: "Plan actuel", upgrade: "Améliorer",
  },
  landing: {
    word1: "Générez.", word2: "Clonez.", word3: "Dominez.",
    subheadline: "Clonage de voix, bibliothèque de voix, narrations et bien plus",
    signIn: "Se connecter", startFree: "Commencer gratuitement", dashboard: "Tableau de bord",
    products: "Produits", company: "Entreprise", pricing: "Tarifs",
    textToSpeech: "Texte en voix", voiceCloning: "Clonage de voix", speechToText: "Voix en texte",
    generatePlay: "Générer et lire", goToDashboard: "Aller au tableau de bord",
  },
  auth: {
    welcome: "Bienvenue", signInSubtitle: "Connectez-vous à votre compte",
    continueWithGoogle: "Continuer avec Google", email: "E-mail", password: "Mot de passe",
    signIn: "Se connecter", createAccount: "Créer un compte",
    noAccount: "Pas encore de compte ? Inscrivez-vous gratuitement", haveAccount: "Déjà un compte ? Connectez-vous",
  },
};

// ─── German ────────────────────────────────────────────────────────────────
const DE: Translations = {
  nav: {
    home: "Startseite", customVoice: "Eigene Stimme", generate: "Text zu Sprache",
    transcribe: "Audio zu Text", translate: "Audio-Übersetzung", history: "Verlauf",
    billing: "Abrechnung", referrals: "Empfehlungen", account: "Mein Konto",
    products: "Produkte", platform: "Plattform", characters: "Zeichen",
    buy: "+ Kaufen", upgradePlan: "Plan upgraden", signOut: "Abmelden",
  },
  tabs: {
    home: "Startseite", generate: "Text zu Sprache", transcribe: "Audio zu Text",
    translate: "Audio-Übersetzung", history: "Verlauf", billing: "Abrechnung",
    voices: "Meine Stimmen", referral: "Empfehlungen",
  },
  home: {
    greeting: "Hallo,", defaultName: "wieder", available: "verfügbare Zeichen",
    cardGenerate: "Text zu Sprache", cardGenerateDesc: "Text sofort in natürliche Sprache umwandeln",
    cardVoices: "Meine Stimmen", cardVoicesDesc: "Eigene Stimmen verwalten und klonen",
    cardHistory: "Verlauf", cardHistoryDesc: "Alle bisherigen Generierungen ansehen",
    cardTranscribe: "Audio zu Text", cardTranscribeDesc: "Beliebige Audiodatei sofort in Text transkribieren",
    cardTranslate: "Audio-Übersetzung", cardTranslateDesc: "Audio automatisch in andere Sprachen übersetzen",
  },
  generate: {
    placeholder: "Schreiben Sie den zu erzählenden Text...", generateBtn: "Audio generieren", generating: "Generierung...",
    settingsTab: "Einstellungen", historyTab: "Verlauf", voiceLabel: "Stimme",
    randomVoice: "Zufällige Stimme", paidOnly: "Nur für bezahlte Pläne",
    paidOnlyLong: "Nur in bezahlten Plänen verfügbar", defaultVoice: "Standardstimme",
    clonedVoice: "Geklonte Stimme", systemVoice: "System", audioControls: "Audio-Steuerung",
    speed: "Geschwindigkeit", volume: "Lautstärke", normalization: "Normalisierung",
    preview: "Vorschau", characters: "Zeichen", credits: "Credits",
  },
  voices: {
    cloneNew: "Neue Stimme klonen", voiceName: "Stimmenname", language: "Sprache",
    gender: "Geschlecht", male: "Männlich", female: "Weiblich", neutral: "Neutral",
    public: "Öffentlich", private: "Privat", search: "Stimmen suchen...",
    explore: "Entdecken", favorites: "Favoriten", myVoices: "Meine geklonten Stimmen",
    all: "Alle", free: "Kostenlos", premium: "Premium", play: "Abspielen",
    download: "Herunterladen", delete: "Löschen",
  },
  account: {
    title: "Einstellungen", subtitle: "Verwalten Sie Ihr Profil und Ihre Sicherheitseinstellungen",
    tabProfile: "Profil", tabSecurity: "Sicherheit", email: "E-Mail-Adresse",
    name: "Name", currentPlan: "Aktueller Plan", profilePhoto: "Profilbild",
    photoDesc: "JPG, PNG, max. 5 MB", connectedAccounts: "Verbundene Konten",
    noConnected: "Keine externen Konten verbunden", managedByGoogle: "Von Google verwaltet",
    connected: "Verbunden", deleteAccount: "Konto löschen",
    deleteDesc: "Diese Aktion ist dauerhaft und nicht rückgängig zu machen", updateName: "Name aktualisieren",
    changePhoto: "Foto ändern", uploading: "Hochladen...", manageSub: "Abonnement verwalten",
    language: "Oberflächensprache", languageDesc: "Sprache der Website ändern",
    twoFactor: "Zwei-Faktor-Authentifizierung (2FA)",
    twoFactorDesc: "Fügen Sie eine zusätzliche Sicherheitsebene hinzu", comingSoon: "Demnächst",
    save: "Speichern", cancel: "Abbrechen", saving: "Speichern...", saved: "✓ Gespeichert",
    firstName: "Vorname", lastName: "Nachname", password: "Passwort",
    currentPassword: "Aktuelles Passwort", newPassword: "Neues Passwort",
    confirmPassword: "Passwort bestätigen", changePassword: "Passwort ändern",
    googleAuth: "Ihr Konto verwendet Google zur Authentifizierung. Es ist kein Passwort erforderlich.",
    deleteConfirmText: "Diese Aktion ist dauerhaft. Alle Ihre Daten, Stimmen und der Verlauf werden gelöscht.",
    deleteConfirmLabel: "Tippen Sie LÖSCHEN zur Bestätigung:", deleteConfirmPlaceholder: "LÖSCHEN",
    deleteConfirmWord: "LÖSCHEN", deleteBtn: "Mein Konto löschen", deleting: "Löschen...",
    passwordError: "Fehler beim Ändern des Passworts", passwordSuccess: "✓ Passwort aktualisiert",
    passwordMismatch: "Passwörter stimmen nicht überein", passwordTooShort: "Das Passwort muss mindestens 8 Zeichen lang sein",
  },
  billing: {
    subscription: "Abonnement", nextRenewal: "Nächste Verlängerung", nextRecharge: "Nächste Aufladung",
    availableChars: "Verfügbare Zeichen", manageSub: "Abonnement verwalten",
    monthly: "Monatlich", annual: "Jährlich", currentPlan: "Aktueller Plan", upgrade: "Upgraden",
  },
  landing: {
    word1: "Generieren.", word2: "Klonen.", word3: "Meistern.",
    subheadline: "Stimmklonen, Stimmbibliothek, Erzählungen und vieles mehr",
    signIn: "Anmelden", startFree: "Kostenlos starten", dashboard: "Dashboard",
    products: "Produkte", company: "Unternehmen", pricing: "Preise",
    textToSpeech: "Text zu Sprache", voiceCloning: "Stimmklonen", speechToText: "Sprache zu Text",
    generatePlay: "Generieren und abspielen", goToDashboard: "Zum Dashboard",
  },
  auth: {
    welcome: "Willkommen zurück", signInSubtitle: "Melden Sie sich bei Ihrem Konto an",
    continueWithGoogle: "Mit Google fortfahren", email: "E-Mail", password: "Passwort",
    signIn: "Anmelden", createAccount: "Konto erstellen",
    noAccount: "Noch kein Konto? Kostenlos registrieren", haveAccount: "Bereits ein Konto? Anmelden",
  },
};

// ─── Portuguese ────────────────────────────────────────────────────────────
const PT: Translations = {
  nav: {
    home: "Início", customVoice: "Voz personalizada", generate: "Texto para voz",
    transcribe: "Áudio para texto", translate: "Tradução de áudio", history: "Histórico",
    billing: "Faturação", referrals: "Referidos", account: "Minha conta",
    products: "Produtos", platform: "Plataforma", characters: "Caracteres",
    buy: "+ Comprar", upgradePlan: "Melhorar plano", signOut: "Sair",
  },
  tabs: {
    home: "Início", generate: "Texto para voz", transcribe: "Áudio para texto",
    translate: "Tradução de áudio", history: "Histórico", billing: "Faturação",
    voices: "Minhas Vozes", referral: "Referidos",
  },
  home: {
    greeting: "Olá,", defaultName: "novamente", available: "caracteres disponíveis",
    cardGenerate: "Texto para voz", cardGenerateDesc: "Converta texto em voz natural instantaneamente",
    cardVoices: "Minhas Vozes", cardVoicesDesc: "Gerencie e clone suas vozes personalizadas",
    cardHistory: "Histórico", cardHistoryDesc: "Revise todas as suas gerações anteriores",
    cardTranscribe: "Áudio para texto", cardTranscribeDesc: "Transcreva qualquer áudio para texto instantaneamente",
    cardTranslate: "Tradução de áudio", cardTranslateDesc: "Traduza seus áudios para outros idiomas automaticamente",
  },
  generate: {
    placeholder: "Escreva o texto a narrar...", generateBtn: "Gerar áudio", generating: "Gerando...",
    settingsTab: "Configurações", historyTab: "Histórico", voiceLabel: "Voz",
    randomVoice: "Voz aleatória", paidOnly: "Apenas planos pagos",
    paidOnlyLong: "Apenas disponível em planos pagos", defaultVoice: "Voz padrão",
    clonedVoice: "Voz clonada", systemVoice: "Sistema", audioControls: "Controles de áudio",
    speed: "Velocidade", volume: "Volume", normalization: "Normalização",
    preview: "Pré-ouvir", characters: "caracteres", credits: "créditos",
  },
  voices: {
    cloneNew: "Clonar nova voz", voiceName: "Nome da voz", language: "Idioma",
    gender: "Género", male: "Masculino", female: "Feminino", neutral: "Neutro",
    public: "Pública", private: "Privada", search: "Procurar vozes...",
    explore: "Explorar", favorites: "Favoritos", myVoices: "Minhas vozes clonadas",
    all: "Todas", free: "Grátis", premium: "Premium", play: "Reproduzir",
    download: "Descarregar", delete: "Eliminar",
  },
  account: {
    title: "Configurações", subtitle: "Gerencie seu perfil e preferências de segurança",
    tabProfile: "Perfil", tabSecurity: "Segurança", email: "Endereço de email",
    name: "Nome", currentPlan: "Plano atual", profilePhoto: "Foto de perfil",
    photoDesc: "JPG, PNG, máx 5MB", connectedAccounts: "Contas conectadas",
    noConnected: "Sem contas externas conectadas", managedByGoogle: "Gerenciado pelo Google",
    connected: "Conectado", deleteAccount: "Eliminar conta",
    deleteDesc: "Esta ação é permanente e irreversível", updateName: "Atualizar nome",
    changePhoto: "Alterar foto", uploading: "Enviando...", manageSub: "Gerir subscrição",
    language: "Idioma da interface", languageDesc: "Alterar o idioma do site",
    twoFactor: "Autenticação de dois fatores (2FA)",
    twoFactorDesc: "Adicione uma camada extra de segurança à sua conta", comingSoon: "Em breve",
    save: "Guardar", cancel: "Cancelar", saving: "A guardar...", saved: "✓ Guardado",
    firstName: "Nome", lastName: "Apelido", password: "Palavra-passe",
    currentPassword: "Palavra-passe atual", newPassword: "Nova palavra-passe",
    confirmPassword: "Confirmar palavra-passe", changePassword: "Alterar palavra-passe",
    googleAuth: "A sua conta usa o Google para autenticação. Não é necessário gerir uma palavra-passe.",
    deleteConfirmText: "Esta ação é permanente e irreversível. Todos os seus dados, vozes e histórico serão eliminados.",
    deleteConfirmLabel: "Escreva EXCLUIR para confirmar:", deleteConfirmPlaceholder: "EXCLUIR",
    deleteConfirmWord: "EXCLUIR", deleteBtn: "Eliminar minha conta", deleting: "Eliminando...",
    passwordError: "Erro ao alterar a palavra-passe", passwordSuccess: "✓ Palavra-passe atualizada",
    passwordMismatch: "As palavras-passe não coincidem", passwordTooShort: "A palavra-passe deve ter pelo menos 8 caracteres",
  },
  billing: {
    subscription: "Subscrição", nextRenewal: "Próxima renovação", nextRecharge: "Próxima recarga",
    availableChars: "Caracteres disponíveis", manageSub: "Gerir subscrição",
    monthly: "Mensal", annual: "Anual", currentPlan: "Plano atual", upgrade: "Melhorar",
  },
  landing: {
    word1: "Gere.", word2: "Clone.", word3: "Domine.",
    subheadline: "Clonagem de voz, biblioteca de vozes, narrações e muito mais",
    signIn: "Iniciar sessão", startFree: "Começar grátis", dashboard: "Dashboard",
    products: "Produtos", company: "Empresa", pricing: "Preços",
    textToSpeech: "Texto para voz", voiceCloning: "Clonagem de voz", speechToText: "Voz para texto",
    generatePlay: "Gerar e reproduzir", goToDashboard: "Ir para o Dashboard",
  },
  auth: {
    welcome: "Bem-vindo de volta", signInSubtitle: "Inicie sessão na sua conta",
    continueWithGoogle: "Continuar com Google", email: "Email", password: "Palavra-passe",
    signIn: "Iniciar sessão", createAccount: "Criar conta",
    noAccount: "Não tem conta? Registe-se gratuitamente", haveAccount: "Já tem conta? Inicie sessão",
  },
};

const ALL: Record<Lang, Translations> = { es: ES, en: EN, fr: FR, de: DE, pt: PT };

// ─── Context ───────────────────────────────────────────────────────────────
const LanguageContext = createContext<LangCtx>({
  lang: "es", t: ES, toggle: () => {}, setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored && (VALID_LANGS as string[]).includes(stored)) {
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
    <LanguageContext.Provider value={{ lang, t: ALL[lang], toggle, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LangCtx {
  return useContext(LanguageContext);
}
