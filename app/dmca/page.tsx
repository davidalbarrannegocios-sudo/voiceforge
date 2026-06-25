"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

type Lang = "es" | "en" | "de" | "fr" | "pt";

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: "es", flag: "https://flagcdn.com/w20/es.png", label: "Español" },
  { code: "en", flag: "https://flagcdn.com/w20/us.png", label: "English" },
  { code: "de", flag: "https://flagcdn.com/w20/de.png", label: "Deutsch" },
  { code: "fr", flag: "https://flagcdn.com/w20/fr.png", label: "Français" },
  { code: "pt", flag: "https://flagcdn.com/w20/pt.png", label: "Português" },
];

// ─── Content types ─────────────────────────────────────────────────────────────

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "agent"; name: string; attn: string; address: string[]; email: string; regNumber: string };

type Section = { id: string; title: string; blocks: Block[] };

type DmcaContent = {
  pageTitle: string;
  legalLabel: string;
  regNumber: string;
  lastUpdated: string;
  company: string;
  introBanner: string;
  backLink: string;
  contactFooter: string;
  sections: Section[];
};

// ─── ESPAÑOL ──────────────────────────────────────────────────────────────────

const es: DmcaContent = {
  pageTitle: "Política DMCA y Agente Designado",
  legalLabel: "Legal",
  regNumber: "Número de registro DMCA: DMCA-1074672",
  lastUpdated: "Última actualización: 25 de junio de 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, EE. UU.",
  introBanner: "De conformidad con la Sección 512 de la Digital Millennium Copyright Act (DMCA), Elite Tube LLC ha designado un agente para recibir notificaciones de infracción de derechos de autor.",
  backLink: "← Inicio",
  contactFooter: "¿Preguntas? Escríbenos a",
  sections: [
    {
      id: "agent",
      title: "Agente Designado para Notificaciones DMCA",
      blocks: [
        { type: "p", text: "De conformidad con la Sección 512 de la Digital Millennium Copyright Act (DMCA), Elite Tube LLC ha designado el siguiente agente para recibir notificaciones de infracción de derechos de autor:" },
        {
          type: "agent",
          name: "Elite Tube LLC",
          attn: "David Albarran Jimenez — DMCA Agent",
          address: ["4111 Hollow Trail Dr, Suite 3624", "Tampa, Florida 33624", "Estados Unidos"],
          email: "soporte@elitelabs.es",
          regNumber: "Número de registro en el U.S. Copyright Office: DMCA-1074672",
        },
      ],
    },
    {
      id: "takedown",
      title: "Procedimiento para Notificaciones de Infracción (Takedown Notice)",
      blocks: [
        { type: "p", text: "Si crees que tu obra protegida por derechos de autor ha sido infringida en Elite Labs, envía una notificación escrita a soporte@elitelabs.es que incluya TODOS los siguientes elementos:" },
        {
          type: "ol",
          items: [
            "Firma: firma física o electrónica de la persona autorizada para actuar en nombre del titular de los derechos.",
            "Identificación de la obra: descripción de la obra protegida que se alega ha sido infringida. Si son múltiples obras, una lista representativa.",
            "Identificación del material infractor: URL exacta o descripción suficiente para localizar el material infractor en nuestra plataforma.",
            "Información de contacto: tu nombre, dirección, teléfono y email.",
            "Declaración de buena fe: declaración de que crees de buena fe que el uso del material no está autorizado por el titular de los derechos, su agente o la ley.",
            "Declaración de exactitud: declaración, bajo pena de perjurio, de que la información de la notificación es exacta y que estás autorizado a actuar en nombre del titular de los derechos.",
          ],
        },
        { type: "p", text: "Las notificaciones incompletas no serán procesadas." },
      ],
    },
    {
      id: "counter",
      title: "Procedimiento de Contranotificación",
      blocks: [
        { type: "p", text: "Si crees que tu contenido fue retirado por error, puedes enviar una contranotificación a soporte@elitelabs.es que incluya:" },
        {
          type: "ol",
          items: [
            "Tu firma física o electrónica.",
            "Identificación del material retirado y su ubicación anterior.",
            "Declaración, bajo pena de perjurio, de que crees de buena fe que el material fue retirado por error o identificación incorrecta.",
            "Tu nombre, dirección, teléfono y declaración de aceptación de la jurisdicción del Tribunal Federal de tu distrito.",
          ],
        },
        { type: "p", text: "Tras recibir una contranotificación válida, podemos restaurar el material en un plazo de 10 a 14 días hábiles, salvo que el reclamante original inicie acciones judiciales." },
      ],
    },
    {
      id: "repeat",
      title: "Política de Reincidentes",
      blocks: [
        { type: "p", text: "De conformidad con la Sección 512(i) de la DMCA, Elite Labs mantiene una política de cancelación de cuentas de usuarios que sean reincidentes en la infracción de derechos de autor. Los usuarios que reciban múltiples notificaciones DMCA válidas serán suspendidos o eliminados permanentemente de la plataforma." },
      ],
    },
    {
      id: "abuse",
      title: "Protección contra Abuso",
      blocks: [
        { type: "p", text: "El envío de notificaciones DMCA falsas o engañosas puede dar lugar a responsabilidad civil y penal conforme a la Sección 512(f) de la DMCA. Elite Labs se reserva el derecho de tomar acciones legales contra quienes presenten notificaciones de mala fe." },
      ],
    },
    {
      id: "safeharbor",
      title: "Safe Harbor",
      blocks: [
        { type: "p", text: "Elite Labs opera como proveedor de servicios conforme a la Sección 512 de la DMCA y tiene derecho a la protección de puerto seguro (safe harbor) siempre que actúe de forma expedita ante notificaciones válidas de infracción." },
      ],
    },
    {
      id: "contact",
      title: "Contacto",
      blocks: [
        { type: "ul", items: ["Elite Tube LLC", "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, EE. UU.", "soporte@elitelabs.es", "elitelabs.es/dmca"] },
      ],
    },
  ],
};

// ─── ENGLISH ──────────────────────────────────────────────────────────────────

const en: DmcaContent = {
  pageTitle: "DMCA Policy and Designated Agent",
  legalLabel: "Legal",
  regNumber: "DMCA Registration Number: DMCA-1074672",
  lastUpdated: "Last updated: June 25, 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
  introBanner: "Pursuant to Section 512 of the Digital Millennium Copyright Act (DMCA), Elite Tube LLC has designated an agent to receive copyright infringement notifications.",
  backLink: "← Home",
  contactFooter: "Questions? Write to us at",
  sections: [
    {
      id: "agent",
      title: "Designated DMCA Agent",
      blocks: [
        { type: "p", text: "Pursuant to Section 512 of the Digital Millennium Copyright Act (DMCA), Elite Tube LLC has designated the following agent to receive copyright infringement notifications:" },
        {
          type: "agent",
          name: "Elite Tube LLC",
          attn: "David Albarran Jimenez — DMCA Agent",
          address: ["4111 Hollow Trail Dr, Suite 3624", "Tampa, Florida 33624", "United States"],
          email: "soporte@elitelabs.es",
          regNumber: "U.S. Copyright Office Designated Agent Directory Registration: DMCA-1074672",
        },
      ],
    },
    {
      id: "takedown",
      title: "Takedown Notice Procedure",
      blocks: [
        { type: "p", text: "If you believe your copyrighted work has been infringed on Elite Labs, please send a written notice to soporte@elitelabs.es that includes ALL of the following elements:" },
        {
          type: "ol",
          items: [
            "Signature: physical or electronic signature of the person authorized to act on behalf of the copyright owner.",
            "Identification of the work: description of the copyrighted work alleged to have been infringed. If multiple works, a representative list.",
            "Identification of infringing material: exact URL or sufficient description to locate the infringing material on our platform.",
            "Contact information: your name, address, phone number, and email.",
            "Good faith statement: a statement that you believe in good faith that the use of the material is not authorized by the copyright owner, its agent, or the law.",
            "Accuracy statement: a statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner.",
          ],
        },
        { type: "p", text: "Incomplete notices will not be processed." },
      ],
    },
    {
      id: "counter",
      title: "Counter-Notification Procedure",
      blocks: [
        { type: "p", text: "If you believe your content was removed in error, you may send a counter-notification to soporte@elitelabs.es that includes:" },
        {
          type: "ol",
          items: [
            "Your physical or electronic signature.",
            "Identification of the removed material and its previous location.",
            "A statement, under penalty of perjury, that you believe in good faith the material was removed by mistake or misidentification.",
            "Your name, address, phone number, and a statement consenting to jurisdiction of the Federal Court in your district.",
          ],
        },
        { type: "p", text: "After receiving a valid counter-notification, we may restore the material within 10 to 14 business days, unless the original claimant initiates legal action." },
      ],
    },
    {
      id: "repeat",
      title: "Repeat Infringer Policy",
      blocks: [
        { type: "p", text: "Pursuant to Section 512(i) of the DMCA, Elite Labs maintains a policy of terminating accounts of users who are repeat copyright infringers. Users who receive multiple valid DMCA notices will be suspended or permanently removed from the platform." },
      ],
    },
    {
      id: "abuse",
      title: "Protection Against Abuse",
      blocks: [
        { type: "p", text: "Submitting false or misleading DMCA notifications may result in civil and criminal liability under Section 512(f) of the DMCA. Elite Labs reserves the right to take legal action against those who submit bad-faith notifications." },
      ],
    },
    {
      id: "safeharbor",
      title: "Safe Harbor",
      blocks: [
        { type: "p", text: "Elite Labs operates as a service provider pursuant to Section 512 of the DMCA and is entitled to safe harbor protection provided it acts expeditiously upon valid infringement notices." },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [
        { type: "ul", items: ["Elite Tube LLC", "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA", "soporte@elitelabs.es", "elitelabs.es/dmca"] },
      ],
    },
  ],
};

// ─── DEUTSCH ──────────────────────────────────────────────────────────────────

const de: DmcaContent = {
  pageTitle: "DMCA-Richtlinie und Benannter Agent",
  legalLabel: "Rechtliches",
  regNumber: "DMCA-Registrierungsnummer: DMCA-1074672",
  lastUpdated: "Letzte Aktualisierung: 25. Juni 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
  introBanner: "Gemäß Abschnitt 512 des Digital Millennium Copyright Act (DMCA) hat Elite Tube LLC einen Agenten benannt, um Urheberrechtsverletzungsmitteilungen entgegenzunehmen.",
  backLink: "← Startseite",
  contactFooter: "Fragen? Schreiben Sie uns an",
  sections: [
    {
      id: "agent",
      title: "Benannter DMCA-Agent",
      blocks: [
        { type: "p", text: "Gemäß Abschnitt 512 des Digital Millennium Copyright Act (DMCA) hat Elite Tube LLC den folgenden Agenten benannt, um Urheberrechtsverletzungsmitteilungen entgegenzunehmen:" },
        {
          type: "agent",
          name: "Elite Tube LLC",
          attn: "David Albarran Jimenez — DMCA Agent",
          address: ["4111 Hollow Trail Dr, Suite 3624", "Tampa, Florida 33624", "USA"],
          email: "soporte@elitelabs.es",
          regNumber: "Registrierung im U.S. Copyright Office Designated Agent Directory: DMCA-1074672",
        },
      ],
    },
    {
      id: "takedown",
      title: "Verfahren für Takedown-Benachrichtigungen",
      blocks: [
        { type: "p", text: "Wenn Sie glauben, dass Ihr urheberrechtlich geschütztes Werk bei Elite Labs verletzt wurde, senden Sie bitte eine schriftliche Mitteilung an soporte@elitelabs.es, die ALLE folgenden Elemente enthält:" },
        {
          type: "ol",
          items: [
            "Unterschrift: physische oder elektronische Unterschrift der Person, die befugt ist, im Namen des Urheberrechtsinhabers zu handeln.",
            "Identifizierung des Werks: Beschreibung des geschützten Werks, das angeblich verletzt wurde. Bei mehreren Werken eine repräsentative Liste.",
            "Identifizierung des verletzenden Materials: genaue URL oder ausreichende Beschreibung zur Lokalisierung des verletzenden Materials auf unserer Plattform.",
            "Kontaktinformationen: Ihr Name, Adresse, Telefonnummer und E-Mail.",
            "Erklärung in gutem Glauben: Erklärung, dass Sie nach Treu und Glauben glauben, dass die Nutzung des Materials vom Urheberrechtsinhaber, seinem Vertreter oder dem Gesetz nicht genehmigt wurde.",
            "Genauigkeitserklärung: Erklärung unter Strafandrohung, dass die Angaben in der Mitteilung korrekt sind und dass Sie befugt sind, im Namen des Urheberrechtsinhabers zu handeln.",
          ],
        },
        { type: "p", text: "Unvollständige Mitteilungen werden nicht bearbeitet." },
      ],
    },
    {
      id: "counter",
      title: "Verfahren für Gegenbenachrichtigungen",
      blocks: [
        { type: "p", text: "Wenn Sie glauben, dass Ihre Inhalte fälschlicherweise entfernt wurden, können Sie eine Gegenbenachrichtigung an soporte@elitelabs.es senden, die Folgendes enthält:" },
        {
          type: "ol",
          items: [
            "Ihre physische oder elektronische Unterschrift.",
            "Identifizierung des entfernten Materials und seines früheren Speicherorts.",
            "Erklärung unter Strafandrohung, dass Sie nach Treu und Glauben glauben, dass das Material irrtümlich oder durch falsche Identifizierung entfernt wurde.",
            "Ihr Name, Adresse, Telefonnummer und eine Erklärung zur Akzeptanz der Zuständigkeit des Bundesgerichts Ihres Bezirks.",
          ],
        },
        { type: "p", text: "Nach Erhalt einer gültigen Gegenbenachrichtigung können wir das Material innerhalb von 10 bis 14 Werktagen wiederherstellen, es sei denn, der ursprüngliche Antragsteller leitet rechtliche Schritte ein." },
      ],
    },
    {
      id: "repeat",
      title: "Richtlinie für Wiederholungstäter",
      blocks: [
        { type: "p", text: "Gemäß Abschnitt 512(i) des DMCA pflegt Elite Labs eine Richtlinie zur Kündigung der Konten von Nutzern, die wiederholt Urheberrechte verletzen. Nutzer, die mehrere gültige DMCA-Mitteilungen erhalten, werden gesperrt oder dauerhaft von der Plattform entfernt." },
      ],
    },
    {
      id: "abuse",
      title: "Schutz vor Missbrauch",
      blocks: [
        { type: "p", text: "Das Einreichen falscher oder irreführender DMCA-Mitteilungen kann gemäß Abschnitt 512(f) des DMCA zu zivil- und strafrechtlicher Haftung führen. Elite Labs behält sich das Recht vor, rechtliche Schritte gegen Personen einzuleiten, die böswillige Mitteilungen einreichen." },
      ],
    },
    {
      id: "safeharbor",
      title: "Safe Harbor",
      blocks: [
        { type: "p", text: "Elite Labs agiert als Dienstanbieter gemäß Abschnitt 512 des DMCA und hat Anspruch auf Safe-Harbor-Schutz, sofern es bei gültigen Verletzungsmitteilungen unverzüglich handelt." },
      ],
    },
    {
      id: "contact",
      title: "Kontakt",
      blocks: [
        { type: "ul", items: ["Elite Tube LLC", "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA", "soporte@elitelabs.es", "elitelabs.es/dmca"] },
      ],
    },
  ],
};

// ─── FRANÇAIS ─────────────────────────────────────────────────────────────────

const fr: DmcaContent = {
  pageTitle: "Politique DMCA et Agent Désigné",
  legalLabel: "Mentions légales",
  regNumber: "Numéro d'enregistrement DMCA : DMCA-1074672",
  lastUpdated: "Dernière mise à jour : 25 juin 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Floride 33624, États-Unis",
  introBanner: "Conformément à la Section 512 du Digital Millennium Copyright Act (DMCA), Elite Tube LLC a désigné un agent pour recevoir les notifications de violation du droit d'auteur.",
  backLink: "← Accueil",
  contactFooter: "Des questions ? Écrivez-nous à",
  sections: [
    {
      id: "agent",
      title: "Agent DMCA Désigné",
      blocks: [
        { type: "p", text: "Conformément à la Section 512 du Digital Millennium Copyright Act (DMCA), Elite Tube LLC a désigné l'agent suivant pour recevoir les notifications de violation du droit d'auteur :" },
        {
          type: "agent",
          name: "Elite Tube LLC",
          attn: "David Albarran Jimenez — DMCA Agent",
          address: ["4111 Hollow Trail Dr, Suite 3624", "Tampa, Floride 33624", "États-Unis"],
          email: "soporte@elitelabs.es",
          regNumber: "Enregistrement dans le répertoire des agents désignés du U.S. Copyright Office : DMCA-1074672",
        },
      ],
    },
    {
      id: "takedown",
      title: "Procédure de Notification de Retrait",
      blocks: [
        { type: "p", text: "Si vous pensez que votre œuvre protégée par le droit d'auteur a été violée sur Elite Labs, envoyez une notification écrite à soporte@elitelabs.es incluant TOUS les éléments suivants :" },
        {
          type: "ol",
          items: [
            "Signature : signature physique ou électronique de la personne autorisée à agir au nom du titulaire des droits d'auteur.",
            "Identification de l'œuvre : description de l'œuvre protégée prétendument violée. Si plusieurs œuvres, une liste représentative.",
            "Identification du matériel contrefaisant : URL exacte ou description suffisante pour localiser le matériel contrefaisant sur notre plateforme.",
            "Coordonnées : votre nom, adresse, numéro de téléphone et e-mail.",
            "Déclaration de bonne foi : déclaration que vous croyez de bonne foi que l'utilisation du matériel n'est pas autorisée par le titulaire des droits, son agent ou la loi.",
            "Déclaration d'exactitude : déclaration, sous peine de parjure, que les informations de la notification sont exactes et que vous êtes autorisé à agir au nom du titulaire des droits.",
          ],
        },
        { type: "p", text: "Les notifications incomplètes ne seront pas traitées." },
      ],
    },
    {
      id: "counter",
      title: "Procédure de Contre-Notification",
      blocks: [
        { type: "p", text: "Si vous pensez que votre contenu a été retiré par erreur, vous pouvez envoyer une contre-notification à soporte@elitelabs.es incluant :" },
        {
          type: "ol",
          items: [
            "Votre signature physique ou électronique.",
            "Identification du matériel retiré et de son emplacement précédent.",
            "Déclaration, sous peine de parjure, que vous croyez de bonne foi que le matériel a été retiré par erreur ou identification incorrecte.",
            "Votre nom, adresse, numéro de téléphone et déclaration d'acceptation de la juridiction du Tribunal fédéral de votre district.",
          ],
        },
        { type: "p", text: "Après réception d'une contre-notification valide, nous pouvons restaurer le matériel dans un délai de 10 à 14 jours ouvrables, sauf si le plaignant original engage des poursuites judiciaires." },
      ],
    },
    {
      id: "repeat",
      title: "Politique des Récidivistes",
      blocks: [
        { type: "p", text: "Conformément à la Section 512(i) du DMCA, Elite Labs maintient une politique de résiliation des comptes des utilisateurs qui violent à plusieurs reprises les droits d'auteur. Les utilisateurs qui reçoivent plusieurs notifications DMCA valides seront suspendus ou définitivement supprimés de la plateforme." },
      ],
    },
    {
      id: "abuse",
      title: "Protection Contre les Abus",
      blocks: [
        { type: "p", text: "L'envoi de notifications DMCA fausses ou trompeuses peut entraîner une responsabilité civile et pénale en vertu de la Section 512(f) du DMCA. Elite Labs se réserve le droit d'engager des poursuites judiciaires contre ceux qui soumettent des notifications de mauvaise foi." },
      ],
    },
    {
      id: "safeharbor",
      title: "Hébergeur de Bonne Foi (Safe Harbor)",
      blocks: [
        { type: "p", text: "Elite Labs opère en tant que fournisseur de services conformément à la Section 512 du DMCA et bénéficie de la protection du safe harbor (port sécurisé) à condition d'agir promptement sur les notifications d'infraction valides." },
      ],
    },
    {
      id: "contact",
      title: "Contact",
      blocks: [
        { type: "ul", items: ["Elite Tube LLC", "4111 Hollow Trail Dr, Suite 3624, Tampa, Floride 33624, États-Unis", "soporte@elitelabs.es", "elitelabs.es/dmca"] },
      ],
    },
  ],
};

// ─── PORTUGUÊS ────────────────────────────────────────────────────────────────

const pt: DmcaContent = {
  pageTitle: "Política DMCA e Agente Designado",
  legalLabel: "Legal",
  regNumber: "Número de registro DMCA: DMCA-1074672",
  lastUpdated: "Última atualização: 25 de junho de 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Flórida 33624, EUA",
  introBanner: "Em conformidade com a Seção 512 do Digital Millennium Copyright Act (DMCA), a Elite Tube LLC designou um agente para receber notificações de violação de direitos autorais.",
  backLink: "← Início",
  contactFooter: "Perguntas? Escreva-nos em",
  sections: [
    {
      id: "agent",
      title: "Agente DMCA Designado",
      blocks: [
        { type: "p", text: "Em conformidade com a Seção 512 do Digital Millennium Copyright Act (DMCA), a Elite Tube LLC designou o seguinte agente para receber notificações de violação de direitos autorais:" },
        {
          type: "agent",
          name: "Elite Tube LLC",
          attn: "David Albarran Jimenez — DMCA Agent",
          address: ["4111 Hollow Trail Dr, Suite 3624", "Tampa, Flórida 33624", "EUA"],
          email: "soporte@elitelabs.es",
          regNumber: "Registro no Diretório de Agentes Designados do U.S. Copyright Office: DMCA-1074672",
        },
      ],
    },
    {
      id: "takedown",
      title: "Procedimento para Notificações de Violação (Takedown Notice)",
      blocks: [
        { type: "p", text: "Se você acredita que sua obra protegida por direitos autorais foi violada no Elite Labs, envie uma notificação por escrito para soporte@elitelabs.es que inclua TODOS os seguintes elementos:" },
        {
          type: "ol",
          items: [
            "Assinatura: assinatura física ou eletrônica da pessoa autorizada a agir em nome do titular dos direitos autorais.",
            "Identificação da obra: descrição da obra protegida que se alega ter sido violada. Se forem várias obras, uma lista representativa.",
            "Identificação do material infrator: URL exata ou descrição suficiente para localizar o material infrator em nossa plataforma.",
            "Informações de contato: seu nome, endereço, telefone e e-mail.",
            "Declaração de boa-fé: declaração de que você acredita de boa-fé que o uso do material não está autorizado pelo titular dos direitos, seu agente ou pela lei.",
            "Declaração de precisão: declaração, sob pena de perjúrio, de que as informações da notificação são precisas e que você está autorizado a agir em nome do titular dos direitos.",
          ],
        },
        { type: "p", text: "Notificações incompletas não serão processadas." },
      ],
    },
    {
      id: "counter",
      title: "Procedimento de Contra-notificação",
      blocks: [
        { type: "p", text: "Se você acredita que seu conteúdo foi removido por engano, pode enviar uma contra-notificação para soporte@elitelabs.es que inclua:" },
        {
          type: "ol",
          items: [
            "Sua assinatura física ou eletrônica.",
            "Identificação do material removido e sua localização anterior.",
            "Declaração, sob pena de perjúrio, de que você acredita de boa-fé que o material foi removido por engano ou identificação incorreta.",
            "Seu nome, endereço, telefone e declaração de aceitação da jurisdição do Tribunal Federal do seu distrito.",
          ],
        },
        { type: "p", text: "Após receber uma contra-notificação válida, podemos restaurar o material em um prazo de 10 a 14 dias úteis, salvo se o reclamante original iniciar ação judicial." },
      ],
    },
    {
      id: "repeat",
      title: "Política de Reincidentes",
      blocks: [
        { type: "p", text: "Em conformidade com a Seção 512(i) da DMCA, o Elite Labs mantém uma política de cancelamento de contas de usuários que sejam reincidentes na violação de direitos autorais. Os usuários que receberem múltiplas notificações DMCA válidas serão suspensos ou removidos permanentemente da plataforma." },
      ],
    },
    {
      id: "abuse",
      title: "Proteção Contra Abuso",
      blocks: [
        { type: "p", text: "O envio de notificações DMCA falsas ou enganosas pode resultar em responsabilidade civil e criminal nos termos da Seção 512(f) da DMCA. O Elite Labs reserva-se o direito de tomar medidas legais contra aqueles que apresentem notificações de má-fé." },
      ],
    },
    {
      id: "safeharbor",
      title: "Porto Seguro (Safe Harbor)",
      blocks: [
        { type: "p", text: "O Elite Labs opera como provedor de serviços nos termos da Seção 512 da DMCA e tem direito à proteção de porto seguro (safe harbor), desde que aja prontamente perante notificações válidas de violação." },
      ],
    },
    {
      id: "contact",
      title: "Contato",
      blocks: [
        { type: "ul", items: ["Elite Tube LLC", "4111 Hollow Trail Dr, Suite 3624, Tampa, Flórida 33624, EUA", "soporte@elitelabs.es", "elitelabs.es/dmca"] },
      ],
    },
  ],
};

const CONTENT: Record<Lang, DmcaContent> = { es, en, de, fr, pt };

// ─── Renderer helpers ─────────────────────────────────────────────────────────

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{block.text}</p>;
  }

  if (block.type === "ul") {
    return (
      <ul className="space-y-2 mt-2">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#9ca3af" }}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6b7280" }} />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol className="space-y-3 mt-2">
        {block.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#9ca3af" }}>
            <span
              className="flex-shrink-0 font-semibold text-xs mt-0.5 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)", color: "#e5e7eb", minWidth: "20px" }}
            >
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "agent") {
    return (
      <div
        className="mt-4 p-5 rounded-xl border"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "#2a2a2a" }}
      >
        <p className="font-bold text-white mb-1">{block.name}</p>
        <p className="text-sm mb-3" style={{ color: "#888888" }}>Attn: {block.attn}</p>
        {block.address.map((line, i) => (
          <p key={i} className="text-sm" style={{ color: "#9ca3af" }}>{line}</p>
        ))}
        <p className="text-sm mt-2">
          <a href={`mailto:${block.email}`} className="hover:text-white transition-colors" style={{ color: "#9ca3af" }}>
            {block.email}
          </a>
        </p>
        <p className="text-xs mt-4 font-semibold" style={{ color: "#6b7280" }}>{block.regNumber}</p>
      </div>
    );
  }

  return null;
}

function RenderSection({ section }: { section: Section }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">{section.title}</h2>
      <div className="space-y-3">
        {section.blocks.map((b, i) => <RenderBlock key={i} block={b} />)}
      </div>
    </section>
  );
}

// ─── Language selector ────────────────────────────────────────────────────────

function LangSelector({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px", borderRadius: "8px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
          cursor: "pointer", color: "#ffffff", fontSize: "13px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.flag} alt={current.code} width={16} height={12} style={{ objectFit: "cover", borderRadius: "2px" }} />
        <span style={{ fontWeight: 500 }}>{current.label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: "140px", zIndex: 9999,
          background: "rgba(18,18,18,0.95)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.10)", borderRadius: "12px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.6)", padding: "4px",
        }}>
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button key={l.code} onClick={() => { onChange(l.code); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "none", cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.6)", fontSize: "13px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.flag} alt={l.code} width={16} height={12} style={{ objectFit: "cover", borderRadius: "2px" }} />
                <span style={{ flex: 1, fontWeight: active ? 600 : 400 }}>{l.label}</span>
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                    <path d="M1.5 5.5L4 8L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DmcaPage() {
  const [lang, setLang] = useState<Lang>("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("elitelabs_lang") as Lang | null;
    if (stored && (["es", "en", "de", "fr", "pt"] as string[]).includes(stored)) {
      setLang(stored);
    }
    setMounted(true);
  }, []);

  const handleLangChange = (l: Lang) => {
    setLang(l);
    localStorage.setItem("elitelabs_lang", l);
  };

  const c = CONTENT[lang];

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f", color: "white" }}>
      <header className="border-b sticky top-0 z-10" style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderColor: "#222222" }}>
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/elitelabs.png" alt="Elite Labs" width={28} height={28} style={{ height: "28px", width: "auto", objectFit: "contain" }} className="rounded-lg" />
            <span className="font-bold text-white">Elite Labs</span>
          </Link>
          <div className="flex items-center gap-4">
            {mounted && <LangSelector lang={lang} onChange={handleLangChange} />}
            <Link href="/" className="text-sm transition-colors hover:text-white" style={{ color: "#888888" }}>
              {c.backLink}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>{c.legalLabel}</p>
          <h1 className="text-4xl font-bold text-white mb-3">{c.pageTitle}</h1>
          <p className="text-xs font-mono mb-1" style={{ color: "#6b7280" }}>{c.regNumber}</p>
          <p className="text-sm mb-1" style={{ color: "#888888" }}>{c.lastUpdated}</p>
          <p className="text-xs" style={{ color: "#555570" }}>{c.company}</p>
        </div>

        <div className="p-5 rounded-xl border mb-10 text-sm leading-relaxed"
          style={{ background: "#1a1a1a", borderLeft: "3px solid rgba(255,255,255,0.2)", borderColor: "#222222", color: "#cccccc" }}>
          {c.introBanner}
        </div>

        <div className="space-y-10">
          {c.sections.map((section) => <RenderSection key={section.id} section={section} />)}
        </div>

        <div className="mt-14 pt-8 border-t" style={{ borderColor: "#222222" }}>
          <p className="text-sm" style={{ color: "#888888" }}>
            {c.contactFooter}{" "}
            <a href="mailto:soporte@elitelabs.es" className="text-gray-300 hover:text-white transition-colors">
              soporte@elitelabs.es
            </a>
          </p>
        </div>
      </main>

      <footer className="border-t mt-16 py-6 px-6" style={{ borderColor: "#222222" }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "#555570" }}>© 2026 Elite Tube LLC. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
              {{ es: "Privacidad", en: "Privacy", de: "Datenschutz", fr: "Confidentialité", pt: "Privacidade" }[lang]}
            </Link>
            <Link href="/terms" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
              {{ es: "Términos", en: "Terms", de: "Nutzungsbedingungen", fr: "Conditions", pt: "Termos" }[lang]}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
