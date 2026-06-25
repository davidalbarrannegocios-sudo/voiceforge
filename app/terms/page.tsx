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

// ─── Content types ────────────────────────────────────────────────────────────

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "group"; title: string; items: string[] };

type SubSection = {
  id: string;
  title: string;
  blocks: Block[];
};

type Section = {
  id: string;
  title: string;
  blocks?: Block[];
  subsections?: SubSection[];
};

type TermsContent = {
  pageTitle: string;
  legalLabel: string;
  lastUpdated: string;
  company: string;
  introBanner: string;
  backLink: string;
  contactFooter: string;
  sections: Section[];
};

// ─── ESPAÑOL ──────────────────────────────────────────────────────────────────

const es: TermsContent = {
  pageTitle: "Términos de Uso",
  legalLabel: "Legal",
  lastUpdated: "Última actualización: 24 de junio de 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, EE. UU.",
  introBanner: "Lee estos términos antes de usar Elite Labs. Al registrarte o usar el servicio, confirmas que los has leído y aceptado.",
  backLink: "← Inicio",
  contactFooter: "¿Tienes preguntas? Escríbenos a",
  sections: [
    {
      id: "1",
      title: "1. Aceptación de los Términos",
      blocks: [
        { type: "p", text: 'Al acceder, registrarte o utilizar la plataforma Elite Labs (en adelante, "el Servicio"), operada por Elite Tube LLC, una sociedad de responsabilidad limitada constituida conforme a las leyes del Estado de Florida (EE. UU.), confirmas que has leído, comprendido y aceptado en su totalidad estos Términos de Uso, así como nuestra Política de Privacidad y Política de Cookies, que forman parte integrante de este acuerdo.' },
        { type: "p", text: "Si actúas en nombre de una empresa u organización, declaras y garantizas que tienes autoridad suficiente para vincular a dicha entidad a estos términos." },
        { type: "p", text: "Si no estás de acuerdo con alguna disposición, debes cesar el uso del Servicio de inmediato." },
        { type: "p", text: "Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios sustanciales serán comunicados por correo electrónico con al menos 30 días de antelación. El uso continuado del Servicio tras la notificación constituye aceptación de los nuevos términos." },
      ],
    },
    {
      id: "2",
      title: "2. Descripción del Servicio",
      blocks: [
        { type: "p", text: "Elite Labs es una plataforma SaaS (Software as a Service) de inteligencia artificial que ofrece los siguientes servicios:" },
        {
          type: "ul",
          items: [
            "Text-to-Speech (TTS): Generación de audio a partir de texto mediante modelos de IA.",
            "Clonación de voz: Creación de modelos de voz personalizados a partir de muestras de audio proporcionadas por el usuario.",
            "Traducción de audio: Traducción y síntesis de audio en múltiples idiomas.",
            "Text-to-Dialogue: Generación de conversaciones entre múltiples voces.",
            "Generación de imagen y vídeo: Creación de contenido visual mediante modelos de IA.",
            "Audio to Text: Transcripción de audio a texto.",
            "Elite API: Acceso programático a los servicios anteriores mediante API REST.",
          ],
        },
        { type: "p", text: "El Servicio opera mediante un sistema de créditos equivalentes a caracteres procesados. Elite Labs se reserva el derecho de modificar, ampliar o discontinuar funcionalidades en cualquier momento." },
      ],
    },
    {
      id: "3",
      title: "3. Elegibilidad y Registro",
      subsections: [
        {
          id: "3.1",
          title: "3.1 Edad mínima",
          blocks: [
            { type: "p", text: "Debes tener al menos 18 años para utilizar el Servicio. Si tienes entre 13 y 17 años, solo puedes usar el Servicio con el consentimiento verificable de un padre o tutor legal. No permitimos el uso del Servicio a menores de 13 años en ningún caso, en cumplimiento de la Ley de Protección de la Privacidad en Línea de los Niños (COPPA) de EE. UU. y normativas equivalentes internacionales." },
          ],
        },
        {
          id: "3.2",
          title: "3.2 Registro de cuenta",
          blocks: [
            { type: "p", text: "Para acceder al Servicio debes crear una cuenta proporcionando información veraz, completa y actualizada. Eres el único responsable de:" },
            {
              type: "ul",
              items: [
                "Mantener la confidencialidad de tus credenciales de acceso.",
                "Todas las actividades que ocurran bajo tu cuenta.",
                "Notificarnos inmediatamente a soporte@elitelabs.es ante cualquier uso no autorizado o brecha de seguridad.",
              ],
            },
            { type: "p", text: "Elite Labs no será responsable de pérdidas derivadas del uso no autorizado de tu cuenta cuando hayas incumplido tu deber de confidencialidad." },
          ],
        },
        {
          id: "3.3",
          title: "3.3 Cuentas empresariales",
          blocks: [
            { type: "p", text: "Las organizaciones que contraten el Servicio en nombre de múltiples usuarios deben designar un administrador responsable del cumplimiento de estos Términos por parte de todos los usuarios de la cuenta." },
          ],
        },
      ],
    },
    {
      id: "4",
      title: "4. Uso Aceptable",
      subsections: [
        {
          id: "4.1",
          title: "4.1 Usos permitidos",
          blocks: [
            { type: "p", text: "Puedes utilizar el Servicio exclusivamente para fines lícitos y en conformidad con la legislación aplicable en tu jurisdicción y en la de los destinatarios de tu contenido." },
          ],
        },
        {
          id: "4.2",
          title: "4.2 Usos prohibidos",
          blocks: [
            { type: "p", text: "Queda expresamente prohibido:" },
            {
              type: "group",
              title: "Contenido ilegal o dañino:",
              items: [
                "Generar audio, imágenes o cualquier contenido que sea ilegal, difamatorio, amenazante, acosador, obsceno, pornográfico, violento o que incite al odio por razones de raza, etnia, religión, género, orientación sexual, discapacidad u otras características protegidas.",
                "Crear contenido que viole derechos de propiedad intelectual de terceros, incluyendo derechos de autor, marcas registradas, patentes o secretos comerciales.",
                "Generar contenido que infrinja derechos de imagen, privacidad o intimidad de personas físicas.",
              ],
            },
            {
              type: "group",
              title: "Clonación de voz y deepfakes:",
              items: [
                "Clonar la voz de cualquier persona sin su consentimiento expreso, libre, informado y documentado.",
                "Crear deepfakes de audio o vídeo con fines fraudulentos, de suplantación de identidad, extorsión, manipulación política o engaño.",
                "Utilizar voces generadas para hacerse pasar por figuras públicas, políticos, funcionarios, representantes de empresas u otras personas reales sin autorización.",
                "Crear contenido que pudiera utilizarse para interferir en procesos electorales o democráticos.",
              ],
            },
            {
              type: "group",
              title: "Seguridad y sistemas:",
              items: [
                "Intentar acceder de forma no autorizada a los sistemas, bases de datos, modelos de IA o infraestructura de Elite Labs.",
                "Realizar ingeniería inversa, descompilar, desensamblar o extraer el código fuente del Servicio.",
                "Introducir malware, virus, troyanos o cualquier código malicioso.",
                "Realizar ataques de denegación de servicio (DDoS) o sobrecargar intencionadamente la plataforma.",
                "Eludir medidas de seguridad, autenticación o control de acceso.",
                "Utilizar bots, scrapers o herramientas automatizadas para acceder al Servicio de manera no autorizada.",
              ],
            },
            {
              type: "group",
              title: "Comerciales:",
              items: [
                "Revender, sublicenciar, redistribuir o comercializar el acceso al Servicio sin autorización expresa por escrito de Elite Labs.",
                "Crear productos o servicios competidores utilizando el Servicio como base.",
                "Utilizar el Servicio para entrenar modelos de IA de terceros sin autorización.",
              ],
            },
          ],
        },
        {
          id: "4.3",
          title: "4.3 Consecuencias del incumplimiento",
          blocks: [
            { type: "p", text: "El incumplimiento de estas prohibiciones puede resultar en la suspensión o cancelación inmediata de tu cuenta, sin derecho a reembolso, y podría dar lugar a acciones legales civiles y/o penales." },
          ],
        },
      ],
    },
    {
      id: "4B",
      title: "4B. Contenido del Usuario y DMCA",
      blocks: [
        { type: "p", text: "El usuario declara y garantiza que:" },
        {
          type: "ul",
          items: [
            "Es titular o tiene licencia de todos los derechos necesarios sobre el contenido que sube o genera a través del Servicio.",
            "El contenido no infringe derechos de autor, marcas, patentes, secretos comerciales, derechos de imagen ni ningún otro derecho de terceros.",
            "Asume plena responsabilidad por cualquier reclamación derivada del contenido que sube o genera.",
          ],
        },
        { type: "p", text: "Elite Labs no es responsable del contenido generado por los usuarios y opera como proveedor de servicios bajo la protección de la Sección 512 de la DMCA (Safe Harbor). Para notificaciones de infracción, consulta nuestra Política DMCA en elitelabs.es/dmca." },
      ],
    },
    {
      id: "5",
      title: "5. Créditos, Planes y Pagos",
      subsections: [
        {
          id: "5.1",
          title: "5.1 Sistema de créditos",
          blocks: [{ type: "p", text: "El Servicio opera mediante un sistema de créditos equivalentes a caracteres procesados. Cada plan incluye una cantidad determinada de créditos mensuales o permanentes según se especifique." }],
        },
        {
          id: "5.2",
          title: "5.2 Planes de suscripción",
          blocks: [{ type: "p", text: "Elite Labs ofrece planes de suscripción mensual y anual, así como packs de créditos adicionales. Los precios vigentes se publican en elitelabs.es/pricing. Los precios están expresados en dólares estadounidenses (USD) e incluyen los impuestos aplicables según la legislación de cada jurisdicción." }],
        },
        {
          id: "5.3",
          title: "5.3 Procesamiento de pagos",
          blocks: [{ type: "p", text: "Los pagos se procesan de forma segura a través de Stripe, Inc. Elite Labs no almacena datos de tarjetas de crédito. Al realizar un pago, aceptas también los Términos de Servicio de Stripe (stripe.com/terms)." }],
        },
        {
          id: "5.4",
          title: "5.4 Renovación automática",
          blocks: [{ type: "p", text: "Las suscripciones se renuevan automáticamente al final de cada período de facturación. Puedes cancelar en cualquier momento desde tu panel de cuenta. La cancelación surte efecto al final del período de facturación en curso, sin cargo adicional." }],
        },
        {
          id: "5.5",
          title: "5.5 Cambios de precio",
          blocks: [{ type: "p", text: "Notificaremos cualquier cambio de precio con al menos 30 días de antelación. El uso continuado del Servicio tras la fecha efectiva del cambio constituye aceptación del nuevo precio." }],
        },
        {
          id: "5.6",
          title: "5.6 Impuestos",
          blocks: [{ type: "p", text: "El usuario es responsable de los impuestos aplicables en su jurisdicción que no sean recaudados por Elite Labs. Los usuarios en la Unión Europea pueden estar sujetos al IVA según la normativa aplicable." }],
        },
      ],
    },
    {
      id: "6",
      title: "6. Política de Reembolsos",
      subsections: [
        {
          id: "6.1",
          title: "6.1 Regla general",
          blocks: [{ type: "p", text: "Los pagos realizados por créditos, packs o suscripciones no son reembolsables, salvo en los casos expresamente previstos en esta política o exigidos por la legislación aplicable." }],
        },
        {
          id: "6.2",
          title: "6.2 Excepciones",
          blocks: [
            { type: "p", text: "Procederá el reembolso en los siguientes casos:" },
            {
              type: "ul",
              items: [
                "Error técnico imputable a Elite Labs que haya consumido créditos sin generar el output correspondiente.",
                "Cargo duplicado por error en el procesamiento del pago.",
                "Derechos legales del consumidor: Los usuarios en la Unión Europea tienen derecho de desistimiento de 14 días para compras digitales, salvo que el servicio haya comenzado a ejecutarse con su consentimiento expreso, en cuyo caso se aplicará un reembolso proporcional.",
              ],
            },
          ],
        },
        {
          id: "6.3",
          title: "6.3 Procedimiento",
          blocks: [{ type: "p", text: "Para solicitar un reembolso, contacta con soporte@elitelabs.es indicando tu nombre, email, fecha de compra, importe y motivo. Resolveremos tu solicitud en un plazo máximo de 10 días hábiles." }],
        },
        {
          id: "6.4",
          title: "6.4 Créditos no utilizados",
          blocks: [{ type: "p", text: "Los créditos no utilizados no tienen fecha de caducidad en los planes activos. En caso de cancelación de la suscripción, los créditos restantes permanecen disponibles durante 90 días adicionales." }],
        },
      ],
    },
    {
      id: "7",
      title: "7. Propiedad Intelectual",
      subsections: [
        {
          id: "7.1",
          title: "7.1 Contenido generado por el usuario",
          blocks: [{ type: "p", text: "El audio, imágenes y demás contenido generado a través del Servicio mediante texto, ajustes y créditos adquiridos por el usuario es propiedad del usuario, sujeto al cumplimiento de estos Términos. El usuario puede usar, distribuir, monetizar y modificar dicho contenido sin restricciones adicionales, incluyendo proyectos comerciales." }],
        },
        {
          id: "7.2",
          title: "7.2 Derechos de Elite Labs",
          blocks: [
            { type: "p", text: "Elite Labs conserva todos los derechos de propiedad intelectual sobre:" },
            {
              type: "ul",
              items: [
                "La plataforma, interfaz y diseño del Servicio.",
                "Los modelos de IA desarrollados por Elite Labs.",
                "El código fuente, algoritmos y arquitectura técnica.",
                "Las marcas, logotipos y denominaciones comerciales de Elite Labs.",
                "La documentación y materiales de marketing.",
              ],
            },
          ],
        },
        {
          id: "7.3",
          title: "7.3 Licencia de uso",
          blocks: [{ type: "p", text: "Elite Labs te concede una licencia limitada, no exclusiva, no transferible y revocable para acceder y usar el Servicio conforme a estos Términos." }],
        },
        {
          id: "7.4",
          title: "7.4 Contenido del usuario",
          blocks: [{ type: "p", text: "Al subir muestras de voz u otro contenido para usar el Servicio, concedes a Elite Labs una licencia limitada para procesar dicho contenido exclusivamente con el fin de prestar el Servicio. No utilizaremos tu contenido para entrenar modelos de IA sin tu consentimiento expreso." }],
        },
        {
          id: "7.5",
          title: "7.5 Modelos de voz de terceros",
          blocks: [{ type: "p", text: "Las voces disponibles en la biblioteca de Elite Labs están sujetas a sus propias licencias. Consulta los términos específicos de cada voz antes de su uso comercial." }],
        },
      ],
    },
    {
      id: "8",
      title: "8. Privacidad y Protección de Datos",
      subsections: [
        {
          id: "8.1",
          title: "8.1 Política de Privacidad",
          blocks: [{ type: "p", text: "El tratamiento de tus datos personales se rige por nuestra Política de Privacidad, disponible en elitelabs.es/privacy, que forma parte integrante de estos Términos." }],
        },
        {
          id: "8.2",
          title: "8.2 GDPR (Usuarios en el Espacio Económico Europeo)",
          blocks: [
            { type: "p", text: "Para usuarios residentes en el EEE, Elite Labs actúa como responsable del tratamiento de datos conforme al Reglamento General de Protección de Datos (GDPR). Tienes derecho a:" },
            {
              type: "ul",
              items: [
                "Acceder a tus datos personales.",
                "Rectificar datos inexactos.",
                'Solicitar la supresión de tus datos ("derecho al olvido").',
                "Oponerte al tratamiento o solicitar su limitación.",
                "Portabilidad de tus datos.",
                "Retirar el consentimiento en cualquier momento.",
                "Presentar reclamación ante la autoridad de protección de datos de tu país.",
              ],
            },
            { type: "p", text: "Puedes ejercer estos derechos contactando a soporte@elitelabs.es." },
          ],
        },
        {
          id: "8.3",
          title: "8.3 CCPA (Usuarios en California)",
          blocks: [{ type: "p", text: "Los residentes en California tienen derechos adicionales conforme a la California Consumer Privacy Act (CCPA), incluyendo el derecho a conocer qué datos personales recopilamos, el derecho a eliminarlos y el derecho a no ser discriminado por ejercer estos derechos. Elite Labs no vende datos personales a terceros." }],
        },
        {
          id: "8.4",
          title: "8.4 Transferencias internacionales",
          blocks: [{ type: "p", text: "Tus datos pueden ser transferidos y procesados en Estados Unidos. Implementamos salvaguardas adecuadas conforme al GDPR, incluyendo Cláusulas Contractuales Tipo aprobadas por la Comisión Europea." }],
        },
      ],
    },
    {
      id: "9",
      title: "9. Disponibilidad y Nivel de Servicio",
      subsections: [
        {
          id: "9.1",
          title: "9.1 Disponibilidad",
          blocks: [{ type: "p", text: "Nos esforzamos por mantener el Servicio disponible 24 horas al día, 7 días a la semana. Sin embargo, no garantizamos una disponibilidad ininterrumpida. Podemos realizar mantenimientos programados, que comunicaremos con antelación razonable." }],
        },
        {
          id: "9.2",
          title: "9.2 Interrupciones",
          blocks: [
            { type: "p", text: "No seremos responsables por interrupciones del Servicio causadas por:" },
            { type: "ul", items: ["Mantenimiento programado.", "Fallos de infraestructura de terceros (proveedores de nube, APIs externas).", "Causas de fuerza mayor.", "Ataques externos."] },
          ],
        },
        {
          id: "9.3",
          title: "9.3 Cambios en el Servicio",
          blocks: [{ type: "p", text: "Nos reservamos el derecho de modificar, suspender o discontinuar cualquier funcionalidad. Ante discontinuaciones que afecten significativamente al Servicio contratado, notificaremos con al menos 30 días de antelación y ofreceremos un reembolso proporcional si corresponde." }],
        },
      ],
    },
    {
      id: "10",
      title: "10. Limitación de Responsabilidad",
      subsections: [
        {
          id: "10.1",
          title: "10.1 Exclusión de garantías",
          blocks: [{ type: "p", text: '"El Servicio se proporciona "tal cual" y "según disponibilidad", sin garantías de ningún tipo, expresas o implícitas, incluyendo garantías de comerciabilidad, idoneidad para un propósito particular o no infracción.' }],
        },
        {
          id: "10.2",
          title: "10.2 Limitación de daños",
          blocks: [
            { type: "p", text: "En la máxima medida permitida por la legislación aplicable, Elite Tube LLC, sus directivos, empleados, socios y proveedores no serán responsables de:" },
            {
              type: "ul",
              items: [
                "Daños indirectos, incidentales, especiales, consecuentes o punitivos.",
                "Pérdida de beneficios, datos, reputación o oportunidades de negocio.",
                "Daños derivados del uso o imposibilidad de uso del Servicio.",
              ],
            },
          ],
        },
        {
          id: "10.3",
          title: "10.3 Límite máximo",
          blocks: [{ type: "p", text: "Nuestra responsabilidad total no excederá el importe efectivamente pagado por el usuario a Elite Labs durante los 3 meses anteriores al evento que originó la reclamación, o 100 USD si no hubiera habido pagos en dicho período." }],
        },
        {
          id: "10.4",
          title: "10.4 Jurisdicciones con limitaciones",
          blocks: [{ type: "p", text: "Algunas jurisdicciones no permiten la exclusión de ciertas garantías o la limitación de responsabilidad por daños consecuentes. En dichos casos, las limitaciones anteriores se aplicarán en la máxima medida permitida por la ley." }],
        },
      ],
    },
    {
      id: "11",
      title: "11. Indemnización",
      blocks: [
        { type: "p", text: "Aceptas indemnizar, defender y mantener indemne a Elite Tube LLC, sus afiliados, directivos, empleados y agentes frente a cualquier reclamación, daño, pérdida, responsabilidad, coste o gasto (incluyendo honorarios legales razonables) que surja de:" },
        {
          type: "ul",
          items: [
            "Tu uso del Servicio en violación de estos Términos.",
            "El contenido que generes o subas a través del Servicio.",
            "Tu violación de derechos de terceros.",
            "Tu violación de la legislación aplicable.",
          ],
        },
      ],
    },
    {
      id: "12",
      title: "12. Suspensión y Terminación",
      subsections: [
        {
          id: "12.1",
          title: "12.1 Terminación por el usuario",
          blocks: [{ type: "p", text: "Puedes cancelar tu cuenta en cualquier momento desde el panel de cuenta o contactando a soporte@elitelabs.es. La cancelación surte efecto al final del período de facturación en curso." }],
        },
        {
          id: "12.2",
          title: "12.2 Terminación por Elite Labs",
          blocks: [
            { type: "p", text: "Podemos suspender o cancelar tu cuenta de forma inmediata, con o sin previo aviso, si:" },
            {
              type: "ul",
              items: [
                "Incumples estos Términos.",
                "Realizas actividades fraudulentas o ilegales.",
                "Tu cuenta representa un riesgo para la seguridad del Servicio o de otros usuarios.",
                "Así lo exige una orden judicial o autoridad competente.",
              ],
            },
          ],
        },
        {
          id: "12.3",
          title: "12.3 Efectos de la terminación",
          blocks: [{ type: "p", text: "Tras la terminación: cesarás de usar el Servicio; los créditos no utilizados se perderán (salvo derecho legal al reembolso); las disposiciones que por su naturaleza deban sobrevivir (propiedad intelectual, limitación de responsabilidad, indemnización, legislación aplicable) continuarán vigentes." }],
        },
      ],
    },
    {
      id: "13",
      title: "13. Arbitraje y Resolución de Disputas",
      subsections: [
        {
          id: "13.1",
          title: "13.1 Acuerdo de arbitraje",
          blocks: [{ type: "p", text: "SALVO QUE LA LEGISLACIÓN APLICABLE LO PROHÍBA, CUALQUIER DISPUTA, RECLAMACIÓN O CONTROVERSIA RELACIONADA CON ESTOS TÉRMINOS O EL SERVICIO SERÁ RESUELTA MEDIANTE ARBITRAJE VINCULANTE INDIVIDUAL, EN VEZ DE ANTE UN TRIBUNAL." }],
        },
        {
          id: "13.2",
          title: "13.2 Procedimiento",
          blocks: [{ type: "p", text: "El arbitraje se realizará conforme a las reglas de la American Arbitration Association (AAA), en inglés o español según acuerdo de las partes, en Tampa, Florida, EE. UU., o de forma remota." }],
        },
        {
          id: "13.3",
          title: "13.3 Renuncia a demandas colectivas",
          blocks: [{ type: "p", text: "LAS PARTES RENUNCIAN AL DERECHO DE PARTICIPAR EN DEMANDAS COLECTIVAS (CLASS ACTIONS). Solo se permiten reclamaciones individuales." }],
        },
        {
          id: "13.4",
          title: "13.4 Excepciones",
          blocks: [
            { type: "p", text: "No obstante lo anterior, cualquiera de las partes puede acudir a un tribunal para:" },
            {
              type: "ul",
              items: [
                "Solicitar medidas cautelares urgentes.",
                "Reclamaciones de propiedad intelectual.",
                "Reclamaciones de importe inferior a 10.000 USD ante tribunales de pequeñas causas.",
              ],
            },
          ],
        },
        {
          id: "13.5",
          title: "13.5 Usuarios en la Unión Europea",
          blocks: [{ type: "p", text: "Los usuarios residentes en la UE conservan sus derechos legales de acceso a los tribunales ordinarios de su país de residencia conforme a la legislación imperativa europea. La Comisión Europea ofrece una plataforma de resolución de litigios en línea: ec.europa.eu/consumers/odr." }],
        },
      ],
    },
    {
      id: "14",
      title: "14. Legislación Aplicable y Jurisdicción",
      blocks: [
        { type: "p", text: "Estos Términos se rigen por las leyes del Estado de Florida (EE. UU.), sin perjuicio de las normas sobre conflictos de leyes. Para disputas no sujetas al acuerdo de arbitraje, las partes se someten a la jurisdicción exclusiva de los tribunales del condado de Hillsborough, Florida, EE. UU." },
        { type: "p", text: "Los usuarios en la Unión Europea conservan los derechos que les reconoce la legislación imperativa de su país de residencia, incluyendo las normas de protección al consumidor." },
      ],
    },
    {
      id: "15",
      title: "15. Disposiciones Generales",
      subsections: [
        {
          id: "15.1",
          title: "15.1 Integración",
          blocks: [{ type: "p", text: "Estos Términos, junto con la Política de Privacidad y Política de Cookies, constituyen el acuerdo completo entre las partes respecto al Servicio y sustituyen cualquier acuerdo previo." }],
        },
        {
          id: "15.2",
          title: "15.2 Divisibilidad",
          blocks: [{ type: "p", text: "Si alguna disposición de estos Términos es declarada inválida o inaplicable, el resto permanecerá en vigor." }],
        },
        {
          id: "15.3",
          title: "15.3 Renuncia",
          blocks: [{ type: "p", text: "La falta de ejercicio de cualquier derecho no constituye renuncia al mismo." }],
        },
        {
          id: "15.4",
          title: "15.4 Cesión",
          blocks: [{ type: "p", text: "No puedes ceder tus derechos u obligaciones bajo estos Términos sin consentimiento previo por escrito de Elite Labs. Elite Labs puede ceder estos Términos en el contexto de una fusión, adquisición o venta de activos." }],
        },
        {
          id: "15.5",
          title: "15.5 Fuerza mayor",
          blocks: [{ type: "p", text: "Elite Labs no será responsable por retrasos o incumplimientos causados por circunstancias fuera de su control razonable, incluyendo desastres naturales, guerras, pandemias, fallos de infraestructura de terceros o actos gubernamentales." }],
        },
        {
          id: "15.6",
          title: "15.6 Idioma",
          blocks: [{ type: "p", text: "En caso de discrepancia entre versiones en distintos idiomas, prevalecerá la versión en inglés." }],
        },
      ],
    },
    {
      id: "16",
      title: "16. Contacto",
      blocks: [
        { type: "p", text: "Para cualquier consulta, reclamación o ejercicio de derechos relacionados con estos Términos:" },
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, Estados Unidos",
            "soporte@elitelabs.es",
            "elitelabs.es",
          ],
        },
        { type: "p", text: "Tiempo de respuesta: máximo 5 días hábiles." },
        { type: "p", text: "Estos Términos de Uso entran en vigor el 24 de junio de 2026 y sustituyen todas las versiones anteriores." },
      ],
    },
  ],
};

// ─── ENGLISH ──────────────────────────────────────────────────────────────────

const en: TermsContent = {
  pageTitle: "Terms of Use",
  legalLabel: "Legal",
  lastUpdated: "Last updated: June 24, 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
  introBanner: "Please read these terms before using Elite Labs. By registering or using the service, you confirm that you have read and accepted them.",
  backLink: "← Home",
  contactFooter: "Have questions? Write to us at",
  sections: [
    {
      id: "1",
      title: "1. Acceptance of Terms",
      blocks: [
        { type: "p", text: 'By accessing, registering, or using the Elite Labs platform (hereinafter, "the Service"), operated by Elite Tube LLC, a limited liability company incorporated under the laws of the State of Florida (USA), you confirm that you have read, understood, and fully accepted these Terms of Use, as well as our Privacy Policy and Cookie Policy, which form an integral part of this agreement.' },
        { type: "p", text: "If you act on behalf of a company or organization, you represent and warrant that you have sufficient authority to bind that entity to these terms." },
        { type: "p", text: "If you disagree with any provision, you must immediately cease using the Service." },
        { type: "p", text: "We reserve the right to modify these Terms at any time. Material changes will be communicated by email at least 30 days in advance. Continued use of the Service after notification constitutes acceptance of the new terms." },
      ],
    },
    {
      id: "2",
      title: "2. Description of Service",
      blocks: [
        { type: "p", text: "Elite Labs is an artificial intelligence SaaS (Software as a Service) platform offering the following services:" },
        {
          type: "ul",
          items: [
            "Text-to-Speech (TTS): Audio generation from text using AI models.",
            "Voice Cloning: Creation of custom voice models from audio samples provided by the user.",
            "Audio Translation: Translation and synthesis of audio in multiple languages.",
            "Text-to-Dialogue: Generation of conversations between multiple voices.",
            "Image and Video Generation: Creation of visual content using AI models.",
            "Audio to Text: Transcription of audio to text.",
            "Elite API: Programmatic access to the above services via REST API.",
          ],
        },
        { type: "p", text: "The Service operates through a credit system equivalent to processed characters. Elite Labs reserves the right to modify, expand, or discontinue functionalities at any time." },
      ],
    },
    {
      id: "3",
      title: "3. Eligibility and Registration",
      subsections: [
        {
          id: "3.1",
          title: "3.1 Minimum age",
          blocks: [
            { type: "p", text: "You must be at least 18 years old to use the Service. If you are between 13 and 17 years old, you may only use the Service with the verifiable consent of a parent or legal guardian. We do not allow use of the Service by anyone under 13 years of age under any circumstances, in compliance with the US Children's Online Privacy Protection Act (COPPA) and equivalent international regulations." },
          ],
        },
        {
          id: "3.2",
          title: "3.2 Account registration",
          blocks: [
            { type: "p", text: "To access the Service you must create an account providing truthful, complete, and up-to-date information. You are solely responsible for:" },
            {
              type: "ul",
              items: [
                "Maintaining the confidentiality of your access credentials.",
                "All activities that occur under your account.",
                "Notifying us immediately at soporte@elitelabs.es of any unauthorized use or security breach.",
              ],
            },
            { type: "p", text: "Elite Labs will not be liable for losses arising from unauthorized use of your account when you have breached your duty of confidentiality." },
          ],
        },
        {
          id: "3.3",
          title: "3.3 Enterprise accounts",
          blocks: [
            { type: "p", text: "Organizations that contract the Service on behalf of multiple users must designate an administrator responsible for ensuring compliance with these Terms by all users of the account." },
          ],
        },
      ],
    },
    {
      id: "4",
      title: "4. Acceptable Use",
      subsections: [
        {
          id: "4.1",
          title: "4.1 Permitted uses",
          blocks: [
            { type: "p", text: "You may use the Service exclusively for lawful purposes and in compliance with applicable law in your jurisdiction and in the jurisdiction of the recipients of your content." },
          ],
        },
        {
          id: "4.2",
          title: "4.2 Prohibited uses",
          blocks: [
            { type: "p", text: "The following are expressly prohibited:" },
            {
              type: "group",
              title: "Illegal or harmful content:",
              items: [
                "Generating audio, images, or any content that is illegal, defamatory, threatening, harassing, obscene, pornographic, violent, or that incites hatred based on race, ethnicity, religion, gender, sexual orientation, disability, or other protected characteristics.",
                "Creating content that violates the intellectual property rights of third parties, including copyrights, trademarks, patents, or trade secrets.",
                "Generating content that infringes the image rights, privacy, or personal life of natural persons.",
              ],
            },
            {
              type: "group",
              title: "Voice cloning and deepfakes:",
              items: [
                "Cloning the voice of any person without their express, free, informed, and documented consent.",
                "Creating audio or video deepfakes for fraudulent purposes, identity impersonation, extortion, political manipulation, or deception.",
                "Using generated voices to impersonate public figures, politicians, officials, company representatives, or other real persons without authorization.",
                "Creating content that could be used to interfere with electoral or democratic processes.",
              ],
            },
            {
              type: "group",
              title: "Security and systems:",
              items: [
                "Attempting to gain unauthorized access to Elite Labs' systems, databases, AI models, or infrastructure.",
                "Reverse engineering, decompiling, disassembling, or extracting the source code of the Service.",
                "Introducing malware, viruses, trojans, or any malicious code.",
                "Conducting denial of service (DDoS) attacks or intentionally overloading the platform.",
                "Circumventing security, authentication, or access control measures.",
                "Using bots, scrapers, or automated tools to access the Service in an unauthorized manner.",
              ],
            },
            {
              type: "group",
              title: "Commercial:",
              items: [
                "Reselling, sublicensing, redistributing, or commercializing access to the Service without express written authorization from Elite Labs.",
                "Creating competing products or services using the Service as a basis.",
                "Using the Service to train third-party AI models without authorization.",
              ],
            },
          ],
        },
        {
          id: "4.3",
          title: "4.3 Consequences of non-compliance",
          blocks: [
            { type: "p", text: "Breach of these prohibitions may result in the immediate suspension or cancellation of your account, without right to refund, and may give rise to civil and/or criminal legal action." },
          ],
        },
      ],
    },
    {
      id: "4B",
      title: "4B. User Content and DMCA",
      blocks: [
        { type: "p", text: "The user represents and warrants that:" },
        {
          type: "ul",
          items: [
            "They own or have licensed all necessary rights over the content they upload or generate through the Service.",
            "The content does not infringe copyrights, trademarks, patents, trade secrets, image rights, or any other third-party rights.",
            "They assume full responsibility for any claims arising from the content they upload or generate.",
          ],
        },
        { type: "p", text: "Elite Labs is not responsible for user-generated content and operates as a service provider under the protection of Section 512 of the DMCA (Safe Harbor). For infringement notifications, please see our DMCA Policy at elitelabs.es/dmca." },
      ],
    },
    {
      id: "5",
      title: "5. Credits, Plans and Payments",
      subsections: [
        {
          id: "5.1",
          title: "5.1 Credit system",
          blocks: [{ type: "p", text: "The Service operates through a credit system equivalent to processed characters. Each plan includes a specific amount of monthly or permanent credits as specified." }],
        },
        {
          id: "5.2",
          title: "5.2 Subscription plans",
          blocks: [{ type: "p", text: "Elite Labs offers monthly and annual subscription plans, as well as additional credit packs. Current prices are published at elitelabs.es/pricing. Prices are expressed in US dollars (USD) and include applicable taxes according to the legislation of each jurisdiction." }],
        },
        {
          id: "5.3",
          title: "5.3 Payment processing",
          blocks: [{ type: "p", text: "Payments are processed securely through Stripe, Inc. Elite Labs does not store credit card data. By making a payment, you also accept Stripe's Terms of Service (stripe.com/terms)." }],
        },
        {
          id: "5.4",
          title: "5.4 Automatic renewal",
          blocks: [{ type: "p", text: "Subscriptions automatically renew at the end of each billing period. You may cancel at any time from your account dashboard. Cancellation takes effect at the end of the current billing period, without additional charge." }],
        },
        {
          id: "5.5",
          title: "5.5 Price changes",
          blocks: [{ type: "p", text: "We will notify you of any price changes at least 30 days in advance. Continued use of the Service after the effective date of the change constitutes acceptance of the new price." }],
        },
        {
          id: "5.6",
          title: "5.6 Taxes",
          blocks: [{ type: "p", text: "The user is responsible for applicable taxes in their jurisdiction that are not collected by Elite Labs. Users in the European Union may be subject to VAT under applicable regulations." }],
        },
      ],
    },
    {
      id: "6",
      title: "6. Refund Policy",
      subsections: [
        {
          id: "6.1",
          title: "6.1 General rule",
          blocks: [{ type: "p", text: "Payments made for credits, packs, or subscriptions are non-refundable, except in cases expressly provided for in this policy or required by applicable law." }],
        },
        {
          id: "6.2",
          title: "6.2 Exceptions",
          blocks: [
            { type: "p", text: "Refunds will be processed in the following cases:" },
            {
              type: "ul",
              items: [
                "Technical error attributable to Elite Labs that consumed credits without generating the corresponding output.",
                "Duplicate charge due to error in payment processing.",
                "Consumer legal rights: Users in the European Union have a 14-day right of withdrawal for digital purchases, unless the service has begun execution with their express consent, in which case a proportional refund will apply.",
              ],
            },
          ],
        },
        {
          id: "6.3",
          title: "6.3 Procedure",
          blocks: [{ type: "p", text: "To request a refund, contact soporte@elitelabs.es indicating your name, email, purchase date, amount, and reason. We will resolve your request within a maximum of 10 business days." }],
        },
        {
          id: "6.4",
          title: "6.4 Unused credits",
          blocks: [{ type: "p", text: "Unused credits have no expiration date in active plans. In case of subscription cancellation, remaining credits remain available for an additional 90 days." }],
        },
      ],
    },
    {
      id: "7",
      title: "7. Intellectual Property",
      subsections: [
        {
          id: "7.1",
          title: "7.1 User-generated content",
          blocks: [{ type: "p", text: "Audio, images, and other content generated through the Service using text, settings, and credits purchased by the user belongs to the user, subject to compliance with these Terms. The user may use, distribute, monetize, and modify such content without additional restrictions, including commercial projects." }],
        },
        {
          id: "7.2",
          title: "7.2 Elite Labs' rights",
          blocks: [
            { type: "p", text: "Elite Labs retains all intellectual property rights over:" },
            {
              type: "ul",
              items: [
                "The platform, interface, and design of the Service.",
                "AI models developed by Elite Labs.",
                "Source code, algorithms, and technical architecture.",
                "Elite Labs' trademarks, logos, and trade names.",
                "Documentation and marketing materials.",
              ],
            },
          ],
        },
        {
          id: "7.3",
          title: "7.3 License of use",
          blocks: [{ type: "p", text: "Elite Labs grants you a limited, non-exclusive, non-transferable, and revocable license to access and use the Service in accordance with these Terms." }],
        },
        {
          id: "7.4",
          title: "7.4 User content",
          blocks: [{ type: "p", text: "By uploading voice samples or other content to use the Service, you grant Elite Labs a limited license to process such content exclusively for the purpose of providing the Service. We will not use your content to train AI models without your express consent." }],
        },
        {
          id: "7.5",
          title: "7.5 Third-party voice models",
          blocks: [{ type: "p", text: "Voices available in Elite Labs' library are subject to their own licenses. Consult the specific terms of each voice before commercial use." }],
        },
      ],
    },
    {
      id: "8",
      title: "8. Privacy and Data Protection",
      subsections: [
        {
          id: "8.1",
          title: "8.1 Privacy Policy",
          blocks: [{ type: "p", text: "The processing of your personal data is governed by our Privacy Policy, available at elitelabs.es/privacy, which forms an integral part of these Terms." }],
        },
        {
          id: "8.2",
          title: "8.2 GDPR (Users in the European Economic Area)",
          blocks: [
            { type: "p", text: "For users residing in the EEA, Elite Labs acts as the data controller pursuant to the General Data Protection Regulation (GDPR). You have the right to:" },
            {
              type: "ul",
              items: [
                "Access your personal data.",
                "Rectify inaccurate data.",
                'Request the deletion of your data ("right to be forgotten").',
                "Object to processing or request its limitation.",
                "Data portability.",
                "Withdraw consent at any time.",
                "Lodge a complaint with the data protection authority in your country.",
              ],
            },
            { type: "p", text: "You may exercise these rights by contacting soporte@elitelabs.es." },
          ],
        },
        {
          id: "8.3",
          title: "8.3 CCPA (Users in California)",
          blocks: [{ type: "p", text: "California residents have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal data we collect, the right to delete it, and the right not to be discriminated against for exercising these rights. Elite Labs does not sell personal data to third parties." }],
        },
        {
          id: "8.4",
          title: "8.4 International transfers",
          blocks: [{ type: "p", text: "Your data may be transferred and processed in the United States. We implement adequate safeguards pursuant to the GDPR, including Standard Contractual Clauses approved by the European Commission." }],
        },
      ],
    },
    {
      id: "9",
      title: "9. Availability and Service Levels",
      subsections: [
        {
          id: "9.1",
          title: "9.1 Availability",
          blocks: [{ type: "p", text: "We strive to keep the Service available 24 hours a day, 7 days a week. However, we do not guarantee uninterrupted availability. We may carry out scheduled maintenance, which we will communicate with reasonable advance notice." }],
        },
        {
          id: "9.2",
          title: "9.2 Interruptions",
          blocks: [
            { type: "p", text: "We will not be liable for service interruptions caused by:" },
            { type: "ul", items: ["Scheduled maintenance.", "Third-party infrastructure failures (cloud providers, external APIs).", "Force majeure causes.", "External attacks."] },
          ],
        },
        {
          id: "9.3",
          title: "9.3 Service changes",
          blocks: [{ type: "p", text: "We reserve the right to modify, suspend, or discontinue any functionality. For discontinuations that significantly affect the contracted Service, we will notify at least 30 days in advance and offer a proportional refund where applicable." }],
        },
      ],
    },
    {
      id: "10",
      title: "10. Limitation of Liability",
      subsections: [
        {
          id: "10.1",
          title: "10.1 Disclaimer of warranties",
          blocks: [{ type: "p", text: 'The Service is provided "as is" and "as available," without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.' }],
        },
        {
          id: "10.2",
          title: "10.2 Limitation of damages",
          blocks: [
            { type: "p", text: "To the maximum extent permitted by applicable law, Elite Tube LLC, its officers, employees, partners, and suppliers shall not be liable for:" },
            {
              type: "ul",
              items: [
                "Indirect, incidental, special, consequential, or punitive damages.",
                "Loss of profits, data, reputation, or business opportunities.",
                "Damages arising from the use or inability to use the Service.",
              ],
            },
          ],
        },
        {
          id: "10.3",
          title: "10.3 Maximum limit",
          blocks: [{ type: "p", text: "Our total liability shall not exceed the amount actually paid by the user to Elite Labs during the 3 months prior to the event giving rise to the claim, or USD 100 if there had been no payments in that period." }],
        },
        {
          id: "10.4",
          title: "10.4 Jurisdictions with limitations",
          blocks: [{ type: "p", text: "Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential damages. In such cases, the above limitations will apply to the maximum extent permitted by law." }],
        },
      ],
    },
    {
      id: "11",
      title: "11. Indemnification",
      blocks: [
        { type: "p", text: "You agree to indemnify, defend, and hold harmless Elite Tube LLC, its affiliates, officers, employees, and agents from any claim, damage, loss, liability, cost, or expense (including reasonable legal fees) arising from:" },
        {
          type: "ul",
          items: [
            "Your use of the Service in violation of these Terms.",
            "The content you generate or upload through the Service.",
            "Your violation of third-party rights.",
            "Your violation of applicable law.",
          ],
        },
      ],
    },
    {
      id: "12",
      title: "12. Suspension and Termination",
      subsections: [
        {
          id: "12.1",
          title: "12.1 Termination by the user",
          blocks: [{ type: "p", text: "You may cancel your account at any time from your account dashboard or by contacting soporte@elitelabs.es. Cancellation takes effect at the end of the current billing period." }],
        },
        {
          id: "12.2",
          title: "12.2 Termination by Elite Labs",
          blocks: [
            { type: "p", text: "We may suspend or cancel your account immediately, with or without prior notice, if:" },
            {
              type: "ul",
              items: [
                "You breach these Terms.",
                "You engage in fraudulent or illegal activities.",
                "Your account poses a security risk to the Service or other users.",
                "Required by a court order or competent authority.",
              ],
            },
          ],
        },
        {
          id: "12.3",
          title: "12.3 Effects of termination",
          blocks: [{ type: "p", text: "Upon termination: you will cease to use the Service; unused credits will be forfeited (unless there is a legal right to refund); provisions that by their nature should survive (intellectual property, limitation of liability, indemnification, governing law) will remain in effect." }],
        },
      ],
    },
    {
      id: "13",
      title: "13. Arbitration and Dispute Resolution",
      subsections: [
        {
          id: "13.1",
          title: "13.1 Arbitration agreement",
          blocks: [{ type: "p", text: "EXCEPT WHERE PROHIBITED BY APPLICABLE LAW, ANY DISPUTE, CLAIM, OR CONTROVERSY RELATED TO THESE TERMS OR THE SERVICE SHALL BE RESOLVED THROUGH BINDING INDIVIDUAL ARBITRATION, RATHER THAN IN COURT." }],
        },
        {
          id: "13.2",
          title: "13.2 Procedure",
          blocks: [{ type: "p", text: "Arbitration shall be conducted pursuant to the rules of the American Arbitration Association (AAA), in English or Spanish as agreed by the parties, in Tampa, Florida, USA, or remotely." }],
        },
        {
          id: "13.3",
          title: "13.3 Class action waiver",
          blocks: [{ type: "p", text: "THE PARTIES WAIVE THE RIGHT TO PARTICIPATE IN CLASS ACTIONS. Only individual claims are permitted." }],
        },
        {
          id: "13.4",
          title: "13.4 Exceptions",
          blocks: [
            { type: "p", text: "Notwithstanding the foregoing, either party may go to court to:" },
            {
              type: "ul",
              items: [
                "Request urgent interim measures.",
                "Intellectual property claims.",
                "Claims of less than USD 10,000 before small claims courts.",
              ],
            },
          ],
        },
        {
          id: "13.5",
          title: "13.5 Users in the European Union",
          blocks: [{ type: "p", text: "Users residing in the EU retain their legal rights to access the ordinary courts of their country of residence pursuant to mandatory European legislation. The European Commission offers an online dispute resolution platform at: ec.europa.eu/consumers/odr." }],
        },
      ],
    },
    {
      id: "14",
      title: "14. Governing Law and Jurisdiction",
      blocks: [
        { type: "p", text: "These Terms are governed by the laws of the State of Florida (USA), without prejudice to conflict of law rules. For disputes not subject to the arbitration agreement, the parties submit to the exclusive jurisdiction of the courts of Hillsborough County, Florida, USA." },
        { type: "p", text: "Users in the European Union retain the rights recognized by the mandatory legislation of their country of residence, including consumer protection rules." },
      ],
    },
    {
      id: "15",
      title: "15. General Provisions",
      subsections: [
        {
          id: "15.1",
          title: "15.1 Integration",
          blocks: [{ type: "p", text: "These Terms, together with the Privacy Policy and Cookie Policy, constitute the entire agreement between the parties regarding the Service and supersede any prior agreements." }],
        },
        {
          id: "15.2",
          title: "15.2 Severability",
          blocks: [{ type: "p", text: "If any provision of these Terms is declared invalid or unenforceable, the remainder shall remain in force." }],
        },
        {
          id: "15.3",
          title: "15.3 Waiver",
          blocks: [{ type: "p", text: "Failure to exercise any right does not constitute a waiver thereof." }],
        },
        {
          id: "15.4",
          title: "15.4 Assignment",
          blocks: [{ type: "p", text: "You may not assign your rights or obligations under these Terms without prior written consent from Elite Labs. Elite Labs may assign these Terms in the context of a merger, acquisition, or sale of assets." }],
        },
        {
          id: "15.5",
          title: "15.5 Force majeure",
          blocks: [{ type: "p", text: "Elite Labs will not be liable for delays or failures caused by circumstances beyond its reasonable control, including natural disasters, wars, pandemics, third-party infrastructure failures, or governmental acts." }],
        },
        {
          id: "15.6",
          title: "15.6 Language",
          blocks: [{ type: "p", text: "In case of discrepancy between versions in different languages, the English version shall prevail." }],
        },
      ],
    },
    {
      id: "16",
      title: "16. Contact",
      blocks: [
        { type: "p", text: "For any inquiry, claim, or exercise of rights related to these Terms:" },
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, United States",
            "soporte@elitelabs.es",
            "elitelabs.es",
          ],
        },
        { type: "p", text: "Response time: maximum 5 business days." },
        { type: "p", text: "These Terms of Use take effect on June 24, 2026, and supersede all previous versions." },
      ],
    },
  ],
};

// ─── DEUTSCH ──────────────────────────────────────────────────────────────────

const de: TermsContent = {
  pageTitle: "Nutzungsbedingungen",
  legalLabel: "Rechtliches",
  lastUpdated: "Letzte Aktualisierung: 24. Juni 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
  introBanner: "Bitte lesen Sie diese Bedingungen, bevor Sie Elite Labs nutzen. Durch die Registrierung oder Nutzung des Dienstes bestätigen Sie, dass Sie diese gelesen und akzeptiert haben.",
  backLink: "← Startseite",
  contactFooter: "Haben Sie Fragen? Schreiben Sie uns an",
  sections: [
    {
      id: "1",
      title: "1. Annahme der Bedingungen",
      blocks: [
        { type: "p", text: "Durch den Zugriff auf oder die Nutzung der Plattform Elite Labs, betrieben von Elite Tube LLC, einer nach dem Recht des Staates Florida (USA) gegründeten Gesellschaft mit beschränkter Haftung, bestätigen Sie, dass Sie diese Nutzungsbedingungen sowie unsere Datenschutzrichtlinie und Cookie-Richtlinie vollständig gelesen, verstanden und akzeptiert haben." },
        { type: "p", text: "Wenn Sie im Namen eines Unternehmens handeln, erklären Sie, dass Sie befugt sind, dieses Unternehmen an diese Bedingungen zu binden." },
        { type: "p", text: "Wir behalten uns das Recht vor, diese Bedingungen jederzeit zu ändern. Wesentliche Änderungen werden mindestens 30 Tage im Voraus per E-Mail mitgeteilt. Die fortgesetzte Nutzung des Dienstes nach der Benachrichtigung gilt als Zustimmung zu den neuen Bedingungen." },
      ],
    },
    {
      id: "2",
      title: "2. Beschreibung des Dienstes",
      blocks: [
        { type: "p", text: "Elite Labs ist eine KI-SaaS-Plattform mit folgenden Diensten:" },
        {
          type: "ul",
          items: [
            "Text-to-Speech (TTS): Audiogenerierung aus Text mittels KI-Modellen.",
            "Stimmklonen: Erstellung benutzerdefinierter Stimmmodelle aus Audiobeispielen des Nutzers.",
            "Audioübersetzung: Übersetzung und Synthese von Audio in mehreren Sprachen.",
            "Text-to-Dialogue: Generierung von Gesprächen zwischen mehreren Stimmen.",
            "Bild- und Videogenerierung: Erstellung visueller Inhalte mittels KI-Modellen.",
            "Audio-zu-Text: Transkription von Audioinhalten in Text.",
            "Elite API: Programmatischer Zugriff auf die obigen Dienste via REST API.",
          ],
        },
        { type: "p", text: "Der Dienst funktioniert über ein Kreditsystem, das verarbeiteten Zeichen entspricht. Elite Labs behält sich das Recht vor, Funktionen jederzeit zu ändern, zu erweitern oder einzustellen." },
      ],
    },
    {
      id: "3",
      title: "3. Berechtigung und Registrierung",
      blocks: [
        { type: "p", text: "Sie müssen mindestens 18 Jahre alt sein. Jugendliche zwischen 13 und 17 Jahren benötigen die nachweisbare Zustimmung eines Elternteils oder Erziehungsberechtigten. Kinder unter 13 Jahren dürfen den Dienst nicht nutzen (COPPA)." },
        { type: "p", text: "Sie sind für die Vertraulichkeit Ihrer Zugangsdaten und alle Aktivitäten unter Ihrem Konto verantwortlich. Melden Sie unbefugte Nutzung oder Sicherheitsverletzungen sofort an soporte@elitelabs.es." },
        { type: "p", text: "Organisationen, die den Dienst für mehrere Nutzer beauftragen, müssen einen Administrator benennen, der für die Einhaltung dieser Bedingungen durch alle Kontonutzer verantwortlich ist." },
      ],
    },
    {
      id: "4",
      title: "4. Akzeptable Nutzung",
      blocks: [
        { type: "p", text: "Der Dienst darf ausschließlich für rechtmäßige Zwecke genutzt werden. Ausdrücklich verboten sind:" },
        {
          type: "group",
          title: "Illegale oder schädliche Inhalte:",
          items: [
            "Generierung von Audio, Bildern oder sonstigen Inhalten, die illegal, diffamierend, bedrohlich, belästigend, obszön, pornografisch, gewalttätig oder hasserregend sind.",
            "Verletzung von Rechten Dritter, einschließlich Urheberrechten, Marken, Patenten oder Geschäftsgeheimnissen.",
            "Erstellung von Inhalten, die das Recht am eigenen Bild, die Privatsphäre oder die Intimsphäre natürlicher Personen verletzen.",
          ],
        },
        {
          type: "group",
          title: "Stimmklonen und Deepfakes:",
          items: [
            "Klonen der Stimme einer Person ohne deren ausdrückliche, freiwillige, informierte und dokumentierte Zustimmung.",
            "Erstellung von Audio- oder Video-Deepfakes zu betrügerischen Zwecken, zur Identitätsdiebstahl, Erpressung, politischen Manipulation oder Täuschung.",
            "Verwendung generierter Stimmen zur Nachahmung öffentlicher Persönlichkeiten, Politiker, Beamter oder anderer realer Personen ohne Genehmigung.",
            "Erstellung von Inhalten, die zur Beeinflussung von Wahlprozessen oder demokratischen Verfahren genutzt werden könnten.",
          ],
        },
        {
          type: "group",
          title: "Sicherheit und Systeme:",
          items: [
            "Unbefugter Zugriff auf Systeme, Datenbanken, KI-Modelle oder Infrastruktur von Elite Labs.",
            "Reverse Engineering, Dekompilierung, Disassemblierung oder Extraktion des Quellcodes des Dienstes.",
            "Einführung von Malware, Viren, Trojanern oder sonstigem Schadcode.",
            "DDoS-Angriffe oder absichtliche Überlastung der Plattform.",
            "Umgehung von Sicherheits-, Authentifizierungs- oder Zugangskontrollmaßnahmen.",
            "Verwendung von Bots, Scrapern oder automatisierten Tools für unbefugten Zugriff.",
          ],
        },
        {
          type: "group",
          title: "Kommerziell:",
          items: [
            "Weiterverkauf, Unterlizenzierung oder Vermarktung des Zugangs zum Dienst ohne ausdrückliche schriftliche Genehmigung von Elite Labs.",
            "Erstellung konkurrierender Produkte oder Dienste auf Basis des Dienstes.",
            "Nutzung des Dienstes zum Training von KI-Modellen Dritter ohne Genehmigung.",
          ],
        },
        { type: "p", text: "Verstöße können zur sofortigen Kontosperrung ohne Rückerstattungsanspruch und zu zivil- und/oder strafrechtlichen Schritten führen." },
      ],
    },
    {
      id: "4B",
      title: "4B. Nutzerinhalte und DMCA",
      blocks: [
        { type: "p", text: "Der Nutzer erklärt und garantiert, dass:" },
        {
          type: "ul",
          items: [
            "Er Inhaber aller notwendigen Rechte an den Inhalten ist oder über entsprechende Lizenzen verfügt, die er über den Dienst hochlädt oder generiert.",
            "Die Inhalte keine Urheberrechte, Marken, Patente, Geschäftsgeheimnisse, Persönlichkeitsrechte oder sonstige Rechte Dritter verletzen.",
            "Er die volle Verantwortung für alle Ansprüche übernimmt, die aus den von ihm hochgeladenen oder generierten Inhalten entstehen.",
          ],
        },
        { type: "p", text: "Elite Labs ist nicht verantwortlich für nutzergenerierte Inhalte und agiert als Dienstanbieter unter dem Schutz von Abschnitt 512 des DMCA (Safe Harbor). Für Urheberrechtsverletzungsmitteilungen beachten Sie bitte unsere DMCA-Richtlinie unter elitelabs.es/dmca." },
      ],
    },
    {
      id: "5",
      title: "5. Guthaben, Pläne und Zahlungen",
      blocks: [
        { type: "p", text: "Der Dienst funktioniert über ein Guthabensystem in Zeichen. Aktuelle Preise in USD unter elitelabs.es/pricing. Zahlungen werden sicher über Stripe, Inc. abgewickelt. Elite Labs speichert keine Kreditkartendaten." },
        { type: "p", text: "Abonnements verlängern sich automatisch am Ende jedes Abrechnungszeitraums. Sie können jederzeit über Ihr Konto-Dashboard kündigen; die Kündigung tritt am Ende des laufenden Abrechnungszeitraums in Kraft." },
        { type: "p", text: "Preisänderungen werden mindestens 30 Tage im Voraus mitgeteilt. Die fortgesetzte Nutzung nach dem Datum des Preisänderung gilt als Zustimmung zum neuen Preis." },
        { type: "p", text: "Der Nutzer ist für die in seiner Jurisdiktion anfallenden Steuern verantwortlich, die nicht von Elite Labs erhoben werden. EU-Nutzer können der Mehrwertsteuer unterliegen." },
      ],
    },
    {
      id: "6",
      title: "6. Rückerstattungsrichtlinie",
      blocks: [
        { type: "p", text: "Zahlungen für Guthaben, Pakete oder Abonnements sind grundsätzlich nicht erstattungsfähig, außer in den ausdrücklich in dieser Richtlinie vorgesehenen oder gesetzlich vorgeschriebenen Fällen." },
        { type: "p", text: "Rückerstattungen erfolgen in folgenden Fällen: technischer Fehler von Elite Labs, der Guthaben verbraucht hat ohne den entsprechenden Output zu erzeugen; doppelte Abbuchung durch Zahlungsverarbeitungsfehler; gesetzliche Verbraucherrechte. EU-Nutzer haben ein 14-tägiges Widerrufsrecht für digitale Käufe, sofern die Ausführung des Dienstes nicht mit ihrer ausdrücklichen Zustimmung begonnen hat." },
        { type: "p", text: "Rückerstattungsanfragen an soporte@elitelabs.es mit Name, E-Mail, Kaufdatum, Betrag und Grund. Bearbeitung innerhalb von maximal 10 Werktagen." },
        { type: "p", text: "Nicht genutztes Guthaben verfällt bei aktiven Plänen nicht. Nach Kündigung bleibt das Restguthaben 90 Tage lang verfügbar." },
      ],
    },
    {
      id: "7",
      title: "7. Geistiges Eigentum",
      blocks: [
        { type: "p", text: "Audio, Bilder und sonstige durch den Dienst generierte Inhalte sind Eigentum des Nutzers, vorbehaltlich der Einhaltung dieser Bedingungen. Der Nutzer kann diese Inhalte ohne Einschränkungen nutzen, verbreiten, monetarisieren und modifizieren, einschließlich kommerzieller Projekte." },
        { type: "p", text: "Elite Labs behält alle geistigen Eigentumsrechte an der Plattform, KI-Modellen, Quellcode, Algorithmen, Marken, Logos und Marketingmaterialien." },
        { type: "p", text: "Elite Labs gewährt Ihnen eine begrenzte, nicht ausschließliche, nicht übertragbare und widerrufliche Lizenz zur Nutzung des Dienstes gemäß diesen Bedingungen." },
        { type: "p", text: "Hochgeladene Sprachproben oder sonstige Inhalte werden ausschließlich zur Erbringung des Dienstes verwendet. Wir nutzen Ihre Inhalte nicht zum Training von KI-Modellen ohne Ihre ausdrückliche Zustimmung." },
      ],
    },
    {
      id: "8",
      title: "8. Datenschutz",
      blocks: [
        { type: "p", text: "Die Verarbeitung Ihrer personenbezogenen Daten richtet sich nach unserer Datenschutzrichtlinie unter elitelabs.es/privacy, die Bestandteil dieser Bedingungen ist." },
        { type: "p", text: "DSGVO: Für Nutzer im EWR ist Elite Labs Verantwortlicher gemäß der Datenschutz-Grundverordnung. Sie haben das Recht auf: Auskunft, Berichtigung, Löschung, Widerspruch, Einschränkung der Verarbeitung, Datenübertragbarkeit, Widerruf der Einwilligung und Beschwerde bei der Datenschutzbehörde. Kontakt: soporte@elitelabs.es." },
        { type: "p", text: "CCPA: Nutzer in Kalifornien haben zusätzliche Rechte gemäß dem California Consumer Privacy Act, einschließlich des Rechts zu erfahren, welche Daten wir erheben, diese löschen zu lassen und nicht diskriminiert zu werden. Elite Labs verkauft keine personenbezogenen Daten." },
        { type: "p", text: "Ihre Daten können in die USA übertragen und dort verarbeitet werden. Wir wenden angemessene Schutzmaßnahmen gemäß der DSGVO an, einschließlich von der EU-Kommission genehmigter Standardvertragsklauseln." },
      ],
    },
    {
      id: "9",
      title: "9. Verfügbarkeit",
      blocks: [
        { type: "p", text: "Wir bemühen uns um eine 24/7-Verfügbarkeit des Dienstes, garantieren jedoch keine unterbrechungsfreie Verfügbarkeit. Geplante Wartungsarbeiten werden mit angemessener Vorlaufzeit angekündigt." },
        { type: "p", text: "Keine Haftung für Unterbrechungen durch geplante Wartung, Ausfälle von Drittanbietern (Cloud-Anbieter, externe APIs), höhere Gewalt oder externe Angriffe." },
        { type: "p", text: "Wir behalten uns das Recht vor, Funktionen zu ändern, auszusetzen oder einzustellen. Bei wesentlichen Änderungen des gebuchten Dienstes erfolgt eine Benachrichtigung mindestens 30 Tage im Voraus und gegebenenfalls eine anteilige Rückerstattung." },
      ],
    },
    {
      id: "10",
      title: "10. Haftungsbeschränkung",
      blocks: [
        { type: "p", text: 'Der Dienst wird "wie besehen" und "nach Verfügbarkeit" bereitgestellt, ohne jegliche ausdrückliche oder stillschweigende Gewährleistung, einschließlich der Gewährleistung der Marktgängigkeit, Eignung für einen bestimmten Zweck oder Nichtverletzung.' },
        { type: "p", text: "Elite Tube LLC, ihre Führungskräfte, Mitarbeiter, Partner und Zulieferer haften im gesetzlich maximal zulässigen Umfang nicht für indirekte, zufällige, besondere, Folge- oder Strafschäden, Gewinnverluste, Datenverluste, Reputationsschäden oder entgangene Geschäftsmöglichkeiten." },
        { type: "p", text: "Die Gesamthaftung übersteigt nicht den in den letzten 3 Monaten an Elite Labs gezahlten Betrag oder 100 USD, falls in diesem Zeitraum keine Zahlungen erfolgt sind. Einige Rechtsordnungen schließen bestimmte Haftungsbeschränkungen aus; in diesen Fällen gelten die Beschränkungen im gesetzlich zulässigen Höchstmaß." },
      ],
    },
    {
      id: "11",
      title: "11. Entschädigung",
      blocks: [
        { type: "p", text: "Sie verpflichten sich, Elite Tube LLC, ihre verbundenen Unternehmen, Führungskräfte, Mitarbeiter und Vertreter von Ansprüchen, Schäden, Verlusten, Verbindlichkeiten, Kosten und Ausgaben (einschließlich angemessener Anwaltskosten) freizustellen, die entstehen aus:" },
        {
          type: "ul",
          items: [
            "Ihrer Nutzung des Dienstes unter Verletzung dieser Bedingungen.",
            "Den von Ihnen generierten oder hochgeladenen Inhalten.",
            "Ihrer Verletzung von Rechten Dritter.",
            "Ihrer Verletzung geltenden Rechts.",
          ],
        },
      ],
    },
    {
      id: "12",
      title: "12. Aussetzung und Kündigung",
      blocks: [
        { type: "p", text: "Sie können Ihr Konto jederzeit über das Konto-Dashboard oder per E-Mail an soporte@elitelabs.es kündigen. Die Kündigung tritt am Ende des laufenden Abrechnungszeitraums in Kraft." },
        { type: "p", text: "Elite Labs kann Konten bei Verstößen gegen diese Bedingungen, bei betrügerischen oder illegalen Aktivitäten, bei Sicherheitsrisiken oder auf gerichtliche Anordnung sofort sperren oder kündigen, mit oder ohne vorherige Benachrichtigung." },
        { type: "p", text: "Nach der Kündigung stellen Sie die Nutzung des Dienstes ein. Nicht genutztes Guthaben verfällt (außer bei gesetzlichem Rückerstattungsanspruch). Bestimmungen, die ihrem Wesen nach fortgelten sollen (geistiges Eigentum, Haftungsbeschränkung, Entschädigung, anwendbares Recht), bleiben in Kraft." },
      ],
    },
    {
      id: "13",
      title: "13. Schiedsverfahren und Streitbeilegung",
      subsections: [
        {
          id: "13.1",
          title: "13.1 Schiedsvereinbarung",
          blocks: [{ type: "p", text: "VORBEHALTLICH ANWENDBAREN RECHTS WERDEN ALLE STREITIGKEITEN, ANSPRÜCHE ODER AUSEINANDERSETZUNGEN IM ZUSAMMENHANG MIT DIESEN BEDINGUNGEN ODER DEM DIENST DURCH VERBINDLICHES EINZELSCHIEDSVERFAHREN BEIGELEGT, NICHT VOR GERICHT." }],
        },
        {
          id: "13.2",
          title: "13.2 Verfahren",
          blocks: [{ type: "p", text: "Das Schiedsverfahren erfolgt gemäß den Regeln der American Arbitration Association (AAA), auf Englisch oder Spanisch nach Vereinbarung der Parteien, in Tampa, Florida, USA, oder per Fernverhandlung." }],
        },
        {
          id: "13.3",
          title: "13.3 Verzicht auf Sammelklagen",
          blocks: [{ type: "p", text: "DIE PARTEIEN VERZICHTEN AUF DAS RECHT, AN SAMMELKLAGEN TEILZUNEHMEN. NUR EINZELNE ANSPRÜCHE SIND ZULÄSSIG." }],
        },
        {
          id: "13.4",
          title: "13.4 Ausnahmen",
          blocks: [
            { type: "p", text: "Ungeachtet des Vorstehenden kann jede Partei ein Gericht anrufen für:" },
            { type: "ul", items: ["Einstweiligen Rechtsschutz.", "Ansprüche des geistigen Eigentums.", "Ansprüche unter 10.000 USD vor Kleinbetragsgerichten."] },
          ],
        },
        {
          id: "13.5",
          title: "13.5 EU-Nutzer",
          blocks: [{ type: "p", text: "Nutzer mit Wohnsitz in der EU behalten ihre gesetzlichen Rechte auf Zugang zu den ordentlichen Gerichten ihres Wohnsitzlandes. Die Europäische Kommission bietet eine Online-Streitbeilegungsplattform: ec.europa.eu/consumers/odr." }],
        },
      ],
    },
    {
      id: "14",
      title: "14. Anwendbares Recht und Gerichtsstand",
      blocks: [
        { type: "p", text: "Diese Bedingungen unterliegen dem Recht des Staates Florida (USA), ohne Rücksicht auf Kollisionsnormen. Für Streitigkeiten, die nicht dem Schiedsverfahren unterliegen, unterwerfen sich die Parteien der ausschließlichen Zuständigkeit der Gerichte im Hillsborough County, Florida, USA." },
        { type: "p", text: "EU-Nutzer behalten die ihnen durch die zwingenden Rechtsvorschriften ihres Wohnsitzlandes gewährten Rechte, einschließlich der Verbraucherschutzvorschriften." },
      ],
    },
    {
      id: "15",
      title: "15. Allgemeine Bestimmungen",
      blocks: [
        { type: "p", text: "Diese Bedingungen bilden zusammen mit der Datenschutz- und Cookie-Richtlinie die vollständige Vereinbarung zwischen den Parteien hinsichtlich des Dienstes und ersetzen alle früheren Vereinbarungen." },
        { type: "p", text: "Sollte eine Bestimmung dieser Bedingungen für ungültig oder nicht durchsetzbar erklärt werden, bleibt der Rest in Kraft. Der Verzicht auf die Ausübung eines Rechts stellt keinen Rechtsverzicht dar. Keine Abtretung ohne vorherige schriftliche Zustimmung von Elite Labs. Elite Labs haftet nicht für Verzögerungen oder Nichterfüllung aufgrund von Umständen außerhalb seiner angemessenen Kontrolle. Bei Widersprüchen zwischen Sprachversionen gilt die englische Fassung." },
      ],
    },
    {
      id: "16",
      title: "16. Kontakt",
      blocks: [
        { type: "p", text: "Für Anfragen, Beschwerden oder Rechteausübung im Zusammenhang mit diesen Bedingungen:" },
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Florida 33624, USA",
            "soporte@elitelabs.es",
            "elitelabs.es",
          ],
        },
        { type: "p", text: "Antwortzeit: maximal 5 Werktage." },
        { type: "p", text: "Diese Nutzungsbedingungen treten am 24. Juni 2026 in Kraft und ersetzen alle früheren Versionen." },
      ],
    },
  ],
};

// ─── FRANÇAIS ─────────────────────────────────────────────────────────────────

const fr: TermsContent = {
  pageTitle: "Conditions d'utilisation",
  legalLabel: "Mentions légales",
  lastUpdated: "Dernière mise à jour : 24 juin 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Floride 33624, États-Unis",
  introBanner: "Veuillez lire ces conditions avant d'utiliser Elite Labs. En vous inscrivant ou en utilisant le service, vous confirmez les avoir lues et acceptées.",
  backLink: "← Accueil",
  contactFooter: "Des questions ? Écrivez-nous à",
  sections: [
    {
      id: "1",
      title: "1. Acceptation des conditions",
      blocks: [
        { type: "p", text: "En accédant ou en utilisant la plateforme Elite Labs, exploitée par Elite Tube LLC, société à responsabilité limitée constituée selon les lois de l'État de Floride (États-Unis), vous confirmez avoir lu, compris et accepté intégralement ces Conditions d'Utilisation, ainsi que notre Politique de Confidentialité et Politique de Cookies, qui font partie intégrante de cet accord." },
        { type: "p", text: "Si vous agissez au nom d'une entreprise ou d'une organisation, vous déclarez et garantissez avoir l'autorité suffisante pour engager cet organisme par ces conditions." },
        { type: "p", text: "Nous nous réservons le droit de modifier ces Conditions à tout moment. Tout changement substantiel sera communiqué par e-mail au moins 30 jours à l'avance. L'utilisation continue du Service après notification vaut acceptation des nouvelles conditions." },
      ],
    },
    {
      id: "2",
      title: "2. Description du service",
      blocks: [
        { type: "p", text: "Elite Labs est une plateforme SaaS d'intelligence artificielle proposant les services suivants :" },
        {
          type: "ul",
          items: [
            "Text-to-Speech (TTS) : génération audio à partir de texte via des modèles d'IA.",
            "Clonage vocal : création de modèles vocaux personnalisés à partir d'échantillons audio de l'utilisateur.",
            "Traduction audio : traduction et synthèse audio en plusieurs langues.",
            "Text-to-Dialogue : génération de conversations entre plusieurs voix.",
            "Génération d'images et de vidéos : création de contenu visuel via des modèles d'IA.",
            "Audio-to-Text : transcription de l'audio en texte.",
            "Elite API : accès programmatique aux services ci-dessus via REST API.",
          ],
        },
        { type: "p", text: "Le Service fonctionne via un système de crédits équivalant à des caractères traités. Elite Labs se réserve le droit de modifier, d'étendre ou d'interrompre des fonctionnalités à tout moment." },
      ],
    },
    {
      id: "3",
      title: "3. Éligibilité et inscription",
      blocks: [
        { type: "p", text: "Vous devez avoir au moins 18 ans pour utiliser le Service. Les personnes entre 13 et 17 ans peuvent l'utiliser avec le consentement vérifiable d'un parent ou tuteur légal. L'utilisation est interdite aux moins de 13 ans (COPPA)." },
        { type: "p", text: "Vous êtes responsable de la confidentialité de vos identifiants et de toutes les activités effectuées sous votre compte. Signalez immédiatement toute utilisation non autorisée à soporte@elitelabs.es." },
        { type: "p", text: "Les organisations contractant le Service pour plusieurs utilisateurs doivent désigner un administrateur responsable du respect de ces Conditions par tous les utilisateurs du compte." },
      ],
    },
    {
      id: "4",
      title: "4. Utilisation acceptable",
      blocks: [
        { type: "p", text: "Vous pouvez utiliser le Service exclusivement à des fins licites et conformément à la législation applicable. Sont expressément interdits :" },
        {
          type: "group",
          title: "Contenu illégal ou nuisible :",
          items: [
            "Générer des audios, images ou tout contenu illégal, diffamatoire, menaçant, harcelant, obscène, pornographique, violent ou incitant à la haine fondée sur la race, l'ethnie, la religion, le genre, l'orientation sexuelle, le handicap ou d'autres caractéristiques protégées.",
            "Créer des contenus violant les droits de propriété intellectuelle de tiers, notamment les droits d'auteur, marques, brevets ou secrets commerciaux.",
            "Générer des contenus portant atteinte au droit à l'image, à la vie privée ou à l'intimité de personnes physiques.",
          ],
        },
        {
          type: "group",
          title: "Clonage vocal et deepfakes :",
          items: [
            "Cloner la voix d'une personne sans son consentement exprès, libre, éclairé et documenté.",
            "Créer des deepfakes audio ou vidéo à des fins frauduleuses, d'usurpation d'identité, d'extorsion, de manipulation politique ou de tromperie.",
            "Utiliser des voix générées pour se faire passer pour des personnalités publiques, des politiciens, des fonctionnaires ou d'autres personnes réelles sans autorisation.",
            "Créer des contenus pouvant être utilisés pour interférer dans des processus électoraux ou démocratiques.",
          ],
        },
        {
          type: "group",
          title: "Sécurité et systèmes :",
          items: [
            "Tenter d'accéder sans autorisation aux systèmes, bases de données, modèles d'IA ou infrastructures d'Elite Labs.",
            "Procéder à de l'ingénierie inverse, décompiler, désassembler ou extraire le code source du Service.",
            "Introduire des logiciels malveillants, virus, chevaux de Troie ou tout code malveillant.",
            "Mener des attaques DDoS ou surcharger intentionnellement la plateforme.",
            "Contourner les mesures de sécurité, d'authentification ou de contrôle d'accès.",
            "Utiliser des bots, scrapers ou outils automatisés pour accéder au Service de manière non autorisée.",
          ],
        },
        {
          type: "group",
          title: "Commerciaux :",
          items: [
            "Revendre, sous-licencier, redistribuer ou commercialiser l'accès au Service sans autorisation écrite expresse d'Elite Labs.",
            "Créer des produits ou services concurrents en utilisant le Service comme base.",
            "Utiliser le Service pour entraîner des modèles d'IA de tiers sans autorisation.",
          ],
        },
        { type: "p", text: "Les violations peuvent entraîner la suspension immédiate du compte sans droit au remboursement et peuvent donner lieu à des poursuites civiles et/ou pénales." },
      ],
    },
    {
      id: "4B",
      title: "4B. Contenu Utilisateur et DMCA",
      blocks: [
        { type: "p", text: "L'utilisateur déclare et garantit que :" },
        {
          type: "ul",
          items: [
            "Il est titulaire ou détient une licence sur tous les droits nécessaires relatifs au contenu qu'il télécharge ou génère via le Service.",
            "Le contenu ne viole aucun droit d'auteur, marque, brevet, secret commercial, droit à l'image ni tout autre droit de tiers.",
            "Il assume l'entière responsabilité de toute réclamation découlant du contenu qu'il télécharge ou génère.",
          ],
        },
        { type: "p", text: "Elite Labs n'est pas responsable du contenu généré par les utilisateurs et opère en tant que fournisseur de services sous la protection de la Section 512 du DMCA (Safe Harbor). Pour les notifications d'infraction, consultez notre Politique DMCA sur elitelabs.es/dmca." },
      ],
    },
    {
      id: "5",
      title: "5. Crédits, plans et paiements",
      blocks: [
        { type: "p", text: "Le Service fonctionne via un système de crédits équivalant à des caractères traités. Les prix actuels en USD sont disponibles sur elitelabs.es/pricing. Les paiements sont traités de manière sécurisée par Stripe, Inc. Elite Labs ne stocke pas les données de carte bancaire." },
        { type: "p", text: "Les abonnements se renouvellent automatiquement à la fin de chaque période de facturation. Vous pouvez annuler à tout moment depuis votre tableau de bord. L'annulation prend effet à la fin de la période de facturation en cours, sans frais supplémentaires." },
        { type: "p", text: "Tout changement de prix sera notifié au moins 30 jours à l'avance. L'utilisation continue du Service après la date d'entrée en vigueur du changement constitue une acceptation du nouveau prix." },
        { type: "p", text: "L'utilisateur est responsable des taxes applicables dans sa juridiction non collectées par Elite Labs. Les utilisateurs de l'UE peuvent être soumis à la TVA selon la réglementation applicable." },
      ],
    },
    {
      id: "6",
      title: "6. Politique de remboursement",
      blocks: [
        { type: "p", text: "Les paiements effectués pour des crédits, packs ou abonnements ne sont généralement pas remboursables, sauf dans les cas expressément prévus par cette politique ou exigés par la loi applicable." },
        { type: "p", text: "Un remboursement sera effectué dans les cas suivants : erreur technique imputable à Elite Labs ayant consommé des crédits sans générer l'output correspondant ; double débit dû à une erreur de traitement du paiement ; droits légaux du consommateur. Les utilisateurs de l'UE bénéficient d'un droit de rétractation de 14 jours pour les achats numériques, sauf si le service a commencé à s'exécuter avec leur consentement exprès." },
        { type: "p", text: "Pour demander un remboursement, contactez soporte@elitelabs.es en indiquant votre nom, e-mail, date d'achat, montant et motif. Nous traiterons votre demande dans un délai maximum de 10 jours ouvrables." },
        { type: "p", text: "Les crédits non utilisés n'ont pas de date d'expiration sur les plans actifs. En cas de résiliation de l'abonnement, les crédits restants restent disponibles pendant 90 jours supplémentaires." },
      ],
    },
    {
      id: "7",
      title: "7. Propriété intellectuelle",
      blocks: [
        { type: "p", text: "L'audio, les images et autres contenus générés via le Service à l'aide de texte, paramètres et crédits achetés par l'utilisateur appartiennent à l'utilisateur, sous réserve du respect de ces Conditions. L'utilisateur peut utiliser, distribuer, monétiser et modifier ce contenu sans restrictions supplémentaires, y compris pour des projets commerciaux." },
        { type: "p", text: "Elite Labs conserve tous les droits de propriété intellectuelle sur la plateforme, l'interface et le design du Service, les modèles d'IA développés, le code source, les algorithmes, les marques, logos et dénominations commerciales, ainsi que la documentation et les matériaux marketing." },
        { type: "p", text: "Elite Labs vous accorde une licence limitée, non exclusive, non transférable et révocable pour accéder au Service et l'utiliser conformément à ces Conditions." },
        { type: "p", text: "En téléchargeant des échantillons vocaux ou d'autres contenus, vous accordez à Elite Labs une licence limitée pour traiter ce contenu exclusivement dans le but de fournir le Service. Nous n'utiliserons pas votre contenu pour entraîner des modèles d'IA sans votre consentement exprès." },
      ],
    },
    {
      id: "8",
      title: "8. Confidentialité et protection des données",
      blocks: [
        { type: "p", text: "Le traitement de vos données personnelles est régi par notre Politique de Confidentialité, disponible sur elitelabs.es/privacy, qui fait partie intégrante de ces Conditions." },
        { type: "p", text: "RGPD : pour les utilisateurs résidant dans l'EEE, Elite Labs agit en tant que responsable du traitement conformément au Règlement Général sur la Protection des Données. Vous disposez du droit d'accès, de rectification, d'effacement, d'opposition, de limitation du traitement, de portabilité des données, de retrait du consentement et de réclamation auprès de l'autorité de protection des données. Contact : soporte@elitelabs.es." },
        { type: "p", text: "CCPA : les résidents de Californie bénéficient de droits supplémentaires en vertu du California Consumer Privacy Act, notamment le droit de savoir quelles données personnelles nous collectons, le droit de les faire supprimer et le droit de ne pas être discriminé pour l'exercice de ces droits. Elite Labs ne vend pas de données personnelles." },
        { type: "p", text: "Vos données peuvent être transférées et traitées aux États-Unis. Nous appliquons des garanties appropriées conformément au RGPD, notamment des Clauses Contractuelles Types approuvées par la Commission européenne." },
      ],
    },
    {
      id: "9",
      title: "9. Disponibilité",
      blocks: [
        { type: "p", text: "Nous nous efforçons de maintenir le Service disponible 24h/24, 7j/7. Cependant, nous ne garantissons pas une disponibilité ininterrompue. Nous pouvons effectuer des maintenances planifiées, que nous communiquerons avec un préavis raisonnable." },
        { type: "p", text: "Nous ne serons pas responsables des interruptions de service causées par : la maintenance planifiée, les pannes d'infrastructure de tiers (fournisseurs cloud, API externes), les cas de force majeure ou les attaques externes." },
        { type: "p", text: "Nous nous réservons le droit de modifier, suspendre ou interrompre toute fonctionnalité. Pour les interruptions affectant significativement le Service contracté, nous informerons avec au moins 30 jours de préavis et proposerons un remboursement proportionnel le cas échéant." },
      ],
    },
    {
      id: "10",
      title: "10. Limitation de responsabilité",
      blocks: [
        { type: "p", text: "Le Service est fourni « tel quel » et « selon disponibilité », sans garantie d'aucune sorte, expresse ou implicite, incluant les garanties de qualité marchande, d'adéquation à un usage particulier ou de non-violation." },
        { type: "p", text: "Dans la mesure maximale autorisée par la loi applicable, Elite Tube LLC, ses dirigeants, employés, partenaires et fournisseurs ne seront pas responsables des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs, pertes de bénéfices, de données, de réputation ou d'opportunités commerciales." },
        { type: "p", text: "Notre responsabilité totale ne dépassera pas le montant effectivement payé par l'utilisateur à Elite Labs au cours des 3 mois précédant l'événement ayant donné lieu à la réclamation, ou 100 USD si aucun paiement n'a été effectué durant cette période." },
      ],
    },
    {
      id: "11",
      title: "11. Indemnisation",
      blocks: [
        { type: "p", text: "Vous acceptez d'indemniser, de défendre et de tenir indemnes Elite Tube LLC, ses affiliés, dirigeants, employés et agents de toute réclamation, dommage, perte, responsabilité, coût ou dépense (y compris les honoraires d'avocat raisonnables) découlant de :" },
        {
          type: "ul",
          items: [
            "Votre utilisation du Service en violation de ces Conditions.",
            "Le contenu que vous générez ou téléchargez via le Service.",
            "Votre violation des droits de tiers.",
            "Votre violation de la loi applicable.",
          ],
        },
      ],
    },
    {
      id: "12",
      title: "12. Suspension et résiliation",
      blocks: [
        { type: "p", text: "Vous pouvez résilier votre compte à tout moment depuis votre tableau de bord ou en contactant soporte@elitelabs.es. La résiliation prend effet à la fin de la période de facturation en cours." },
        { type: "p", text: "Elite Labs peut suspendre ou résilier votre compte immédiatement, avec ou sans préavis, en cas de violation de ces Conditions, d'activités frauduleuses ou illégales, de risque pour la sécurité du Service ou sur injonction judiciaire." },
        { type: "p", text: "Après résiliation : vous cesserez d'utiliser le Service ; les crédits non utilisés seront perdus (sauf droit légal au remboursement) ; les dispositions qui doivent survivre par leur nature (propriété intellectuelle, limitation de responsabilité, indemnisation, droit applicable) resteront en vigueur." },
      ],
    },
    {
      id: "13",
      title: "13. Arbitrage et résolution des litiges",
      subsections: [
        {
          id: "13.1",
          title: "13.1 Accord d'arbitrage",
          blocks: [{ type: "p", text: "SAUF INTERDICTION PAR LA LOI APPLICABLE, TOUT LITIGE, RÉCLAMATION OU DIFFÉREND LIÉ À CES CONDITIONS OU AU SERVICE SERA RÉSOLU PAR ARBITRAGE INDIVIDUEL CONTRAIGNANT, PLUTÔT QUE DEVANT UN TRIBUNAL." }],
        },
        {
          id: "13.2",
          title: "13.2 Procédure",
          blocks: [{ type: "p", text: "L'arbitrage sera conduit conformément aux règles de l'American Arbitration Association (AAA), en anglais ou en espagnol selon accord des parties, à Tampa, Floride, États-Unis, ou à distance." }],
        },
        {
          id: "13.3",
          title: "13.3 Renonciation aux actions collectives",
          blocks: [{ type: "p", text: "LES PARTIES RENONCENT AU DROIT DE PARTICIPER À DES ACTIONS COLLECTIVES (CLASS ACTIONS). SEULES LES RÉCLAMATIONS INDIVIDUELLES SONT AUTORISÉES." }],
        },
        {
          id: "13.4",
          title: "13.4 Exceptions",
          blocks: [
            { type: "p", text: "Nonobstant ce qui précède, chaque partie peut saisir un tribunal pour :" },
            { type: "ul", items: ["Demander des mesures conservatoires urgentes.", "Des réclamations relatives à la propriété intellectuelle.", "Des réclamations inférieures à 10 000 USD devant les juridictions de proximité."] },
          ],
        },
        {
          id: "13.5",
          title: "13.5 Utilisateurs dans l'Union européenne",
          blocks: [{ type: "p", text: "Les utilisateurs résidant dans l'UE conservent leurs droits légaux d'accès aux tribunaux ordinaires de leur pays de résidence conformément à la législation européenne impérative. La Commission européenne propose une plateforme de résolution des litiges en ligne : ec.europa.eu/consumers/odr." }],
        },
      ],
    },
    {
      id: "14",
      title: "14. Droit applicable et juridiction",
      blocks: [
        { type: "p", text: "Ces Conditions sont régies par les lois de l'État de Floride (États-Unis), sans égard aux règles de conflit de lois. Pour les litiges non soumis à l'accord d'arbitrage, les parties se soumettent à la juridiction exclusive des tribunaux du comté de Hillsborough, Floride, États-Unis." },
        { type: "p", text: "Les utilisateurs de l'UE conservent les droits que leur reconnaît la législation impérative de leur pays de résidence, notamment les règles de protection des consommateurs." },
      ],
    },
    {
      id: "15",
      title: "15. Dispositions générales",
      blocks: [
        { type: "p", text: "Ces Conditions, avec la Politique de Confidentialité et la Politique de Cookies, constituent l'accord complet entre les parties concernant le Service et remplacent tout accord antérieur." },
        { type: "p", text: "Si une disposition est déclarée invalide ou inapplicable, le reste demeure en vigueur. Le non-exercice d'un droit ne constitue pas une renonciation. Aucune cession sans consentement écrit préalable d'Elite Labs. Elite Labs ne sera pas responsable des retards ou manquements causés par des circonstances hors de son contrôle raisonnable. En cas de contradiction entre versions linguistiques, la version anglaise prévaut." },
      ],
    },
    {
      id: "16",
      title: "16. Contact",
      blocks: [
        { type: "p", text: "Pour toute question, réclamation ou exercice de droits relatifs à ces Conditions :" },
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Floride 33624, États-Unis",
            "soporte@elitelabs.es",
            "elitelabs.es",
          ],
        },
        { type: "p", text: "Délai de réponse : maximum 5 jours ouvrables." },
        { type: "p", text: "Ces Conditions d'Utilisation entrent en vigueur le 24 juin 2026 et remplacent toutes les versions précédentes." },
      ],
    },
  ],
};

// ─── PORTUGUÊS ────────────────────────────────────────────────────────────────

const pt: TermsContent = {
  pageTitle: "Termos de Uso",
  legalLabel: "Legal",
  lastUpdated: "Última atualização: 24 de junho de 2026",
  company: "Elite Tube LLC · 4111 Hollow Trail Dr, Suite 3624, Tampa, Flórida 33624, EUA",
  introBanner: "Por favor, leia estes Termos antes de usar o Elite Labs. Ao se registrar ou usar o serviço, você confirma que os leu e aceitou.",
  backLink: "← Início",
  contactFooter: "Tem perguntas? Escreva-nos em",
  sections: [
    {
      id: "1",
      title: "1. Aceitação dos Termos",
      blocks: [
        { type: "p", text: "Ao acessar, registrar-se ou utilizar a plataforma Elite Labs (doravante \"o Serviço\"), operada pela Elite Tube LLC, uma sociedade de responsabilidade limitada constituída de acordo com as leis do Estado da Flórida (EUA), você confirma que leu, compreendeu e aceitou integralmente estes Termos de Uso, bem como nossa Política de Privacidade e Política de Cookies, que fazem parte integrante deste acordo." },
        { type: "p", text: "Se você age em nome de uma empresa ou organização, declara e garante que tem autoridade suficiente para vincular essa entidade a estes Termos." },
        { type: "p", text: "Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações substanciais serão comunicadas por e-mail com pelo menos 30 dias de antecedência. O uso continuado do Serviço após a notificação constitui aceitação dos novos termos." },
      ],
    },
    {
      id: "2",
      title: "2. Descrição do Serviço",
      blocks: [
        { type: "p", text: "Elite Labs é uma plataforma SaaS (Software as a Service) de inteligência artificial que oferece os seguintes serviços:" },
        {
          type: "ul",
          items: [
            "Text-to-Speech (TTS): geração de áudio a partir de texto usando modelos de IA.",
            "Clonagem de voz: criação de modelos de voz personalizados a partir de amostras de áudio fornecidas pelo usuário.",
            "Tradução de áudio: tradução e síntese de áudio em vários idiomas.",
            "Text-to-Dialogue: geração de conversas entre múltiplas vozes.",
            "Geração de imagens e vídeos: criação de conteúdo visual usando modelos de IA.",
            "Áudio para Texto: transcrição de áudio em texto.",
            "Elite API: acesso programático aos serviços acima via API REST.",
          ],
        },
        { type: "p", text: "O Serviço funciona através de um sistema de créditos equivalentes a caracteres processados. A Elite Labs reserva-se o direito de modificar, expandir ou descontinuar funcionalidades a qualquer momento." },
      ],
    },
    {
      id: "3",
      title: "3. Elegibilidade e Registro",
      blocks: [
        { type: "p", text: "Você deve ter pelo menos 18 anos para usar o Serviço. Pessoas entre 13 e 17 anos podem usar o Serviço com o consentimento verificável de um pai ou responsável legal. O uso é proibido para menores de 13 anos (COPPA)." },
        { type: "p", text: "Você é o único responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades que ocorram na sua conta. Notifique-nos imediatamente em soporte@elitelabs.es sobre qualquer uso não autorizado ou violação de segurança." },
        { type: "p", text: "Organizações que contratam o Serviço em nome de vários usuários devem designar um administrador responsável pelo cumprimento destes Termos por todos os usuários da conta." },
      ],
    },
    {
      id: "4",
      title: "4. Uso Aceitável",
      blocks: [
        { type: "p", text: "Você pode usar o Serviço exclusivamente para fins lícitos e em conformidade com a legislação aplicável. São expressamente proibidos:" },
        {
          type: "group",
          title: "Conteúdo ilegal ou prejudicial:",
          items: [
            "Gerar áudio, imagens ou qualquer conteúdo ilegal, difamatório, ameaçador, assediante, obsceno, pornográfico, violento ou que incite ao ódio com base em raça, etnia, religião, gênero, orientação sexual, deficiência ou outras características protegidas.",
            "Criar conteúdo que viole direitos de propriedade intelectual de terceiros, incluindo direitos autorais, marcas registradas, patentes ou segredos comerciais.",
            "Gerar conteúdo que infrinja direitos de imagem, privacidade ou intimidade de pessoas físicas.",
          ],
        },
        {
          type: "group",
          title: "Clonagem de voz e deepfakes:",
          items: [
            "Clonar a voz de qualquer pessoa sem seu consentimento expresso, livre, informado e documentado.",
            "Criar deepfakes de áudio ou vídeo para fins fraudulentos, de usurpação de identidade, extorsão, manipulação política ou engano.",
            "Usar vozes geradas para se fazer passar por figuras públicas, políticos, funcionários ou outras pessoas reais sem autorização.",
            "Criar conteúdo que possa ser usado para interferir em processos eleitorais ou democráticos.",
          ],
        },
        {
          type: "group",
          title: "Segurança e sistemas:",
          items: [
            "Tentar acessar sem autorização os sistemas, bancos de dados, modelos de IA ou infraestrutura da Elite Labs.",
            "Realizar engenharia reversa, decompilar, desmontar ou extrair o código-fonte do Serviço.",
            "Introduzir malware, vírus, trojans ou qualquer código malicioso.",
            "Realizar ataques de negação de serviço (DDoS) ou sobrecarregar intencionalmente a plataforma.",
            "Contornar medidas de segurança, autenticação ou controle de acesso.",
            "Usar bots, scrapers ou ferramentas automatizadas para acessar o Serviço de forma não autorizada.",
          ],
        },
        {
          type: "group",
          title: "Comerciais:",
          items: [
            "Revender, sublicenciar, redistribuir ou comercializar o acesso ao Serviço sem autorização expressa por escrito da Elite Labs.",
            "Criar produtos ou serviços concorrentes usando o Serviço como base.",
            "Usar o Serviço para treinar modelos de IA de terceiros sem autorização.",
          ],
        },
        { type: "p", text: "O descumprimento dessas proibições pode resultar na suspensão ou cancelamento imediato da sua conta, sem direito a reembolso, e pode dar origem a ações legais civis e/ou criminais." },
      ],
    },
    {
      id: "4B",
      title: "4B. Conteúdo do Usuário e DMCA",
      blocks: [
        { type: "p", text: "O usuário declara e garante que:" },
        {
          type: "ul",
          items: [
            "É titular ou possui licença de todos os direitos necessários sobre o conteúdo que carrega ou gera por meio do Serviço.",
            "O conteúdo não infringe direitos autorais, marcas, patentes, segredos comerciais, direitos de imagem nem quaisquer outros direitos de terceiros.",
            "Assume plena responsabilidade por qualquer reclamação decorrente do conteúdo que carrega ou gera.",
          ],
        },
        { type: "p", text: "A Elite Labs não é responsável pelo conteúdo gerado pelos usuários e opera como provedora de serviços sob a proteção da Seção 512 do DMCA (Safe Harbor). Para notificações de violação, consulte nossa Política DMCA em elitelabs.es/dmca." },
      ],
    },
    {
      id: "5",
      title: "5. Créditos, Planos e Pagamentos",
      blocks: [
        { type: "p", text: "O Serviço funciona através de um sistema de créditos equivalentes a caracteres processados. Os preços atuais em USD estão disponíveis em elitelabs.es/pricing. Os pagamentos são processados de forma segura pela Stripe, Inc. A Elite Labs não armazena dados de cartão de crédito." },
        { type: "p", text: "As assinaturas se renovam automaticamente no final de cada período de faturamento. Você pode cancelar a qualquer momento pelo painel da conta. O cancelamento entra em vigor no final do período de faturamento em curso, sem encargos adicionais." },
        { type: "p", text: "Qualquer alteração de preço será notificada com pelo menos 30 dias de antecedência. O uso continuado do Serviço após a data efetiva da alteração constitui aceitação do novo preço." },
        { type: "p", text: "O usuário é responsável pelos impostos aplicáveis em sua jurisdição não coletados pela Elite Labs. Os usuários na União Europeia podem estar sujeitos ao IVA de acordo com a regulamentação aplicável." },
      ],
    },
    {
      id: "6",
      title: "6. Política de Reembolso",
      blocks: [
        { type: "p", text: "Os pagamentos realizados por créditos, packs ou assinaturas não são reembolsáveis, exceto nos casos expressamente previstos nesta política ou exigidos pela legislação aplicável." },
        { type: "p", text: "O reembolso será processado nos seguintes casos: erro técnico imputável à Elite Labs que consumiu créditos sem gerar o output correspondente; cobrança duplicada por erro no processamento do pagamento; direitos legais do consumidor. Os usuários da UE têm direito de arrependimento de 14 dias para compras digitais, salvo se o serviço tiver começado a ser executado com seu consentimento expresso." },
        { type: "p", text: "Para solicitar um reembolso, entre em contato com soporte@elitelabs.es informando seu nome, e-mail, data da compra, valor e motivo. Processaremos sua solicitação em um prazo máximo de 10 dias úteis." },
        { type: "p", text: "Os créditos não utilizados não têm prazo de validade em planos ativos. Em caso de cancelamento da assinatura, os créditos restantes permanecem disponíveis por 90 dias adicionais." },
      ],
    },
    {
      id: "7",
      title: "7. Propriedade Intelectual",
      blocks: [
        { type: "p", text: "O áudio, imagens e demais conteúdos gerados através do Serviço usando texto, configurações e créditos adquiridos pelo usuário são propriedade do usuário, sujeito ao cumprimento destes Termos. O usuário pode usar, distribuir, monetizar e modificar esse conteúdo sem restrições adicionais, incluindo projetos comerciais." },
        { type: "p", text: "A Elite Labs retém todos os direitos de propriedade intelectual sobre a plataforma, interface e design do Serviço, modelos de IA desenvolvidos, código-fonte, algoritmos, marcas, logotipos e nomes comerciais, documentação e materiais de marketing." },
        { type: "p", text: "A Elite Labs concede a você uma licença limitada, não exclusiva, intransferível e revogável para acessar e usar o Serviço de acordo com estes Termos." },
        { type: "p", text: "Ao enviar amostras de voz ou outros conteúdos, você concede à Elite Labs uma licença limitada para processar esse conteúdo exclusivamente com o objetivo de prestar o Serviço. Não usaremos seu conteúdo para treinar modelos de IA sem seu consentimento expresso." },
      ],
    },
    {
      id: "8",
      title: "8. Privacidade e Proteção de Dados",
      blocks: [
        { type: "p", text: "O tratamento dos seus dados pessoais é regido pela nossa Política de Privacidade, disponível em elitelabs.es/privacy, que faz parte integrante destes Termos." },
        { type: "p", text: "GDPR: para usuários residentes no EEE, a Elite Labs atua como responsável pelo tratamento de dados nos termos do Regulamento Geral de Proteção de Dados. Você tem o direito de acessar, retificar, excluir, opor-se ao tratamento ou solicitar a sua limitação, portabilidade, retirar o consentimento a qualquer momento e apresentar reclamação à autoridade de proteção de dados. Contato: soporte@elitelabs.es." },
        { type: "p", text: "CCPA: os residentes na Califórnia têm direitos adicionais ao abrigo da California Consumer Privacy Act, incluindo o direito de saber quais dados pessoais coletamos, o direito de excluí-los e o direito de não ser discriminado por exercer esses direitos. A Elite Labs não vende dados pessoais a terceiros." },
        { type: "p", text: "Seus dados podem ser transferidos e processados nos Estados Unidos. Implementamos salvaguardas adequadas nos termos do GDPR, incluindo Cláusulas Contratuais Padrão aprovadas pela Comissão Europeia." },
      ],
    },
    {
      id: "9",
      title: "9. Disponibilidade",
      blocks: [
        { type: "p", text: "Esforçamo-nos para manter o Serviço disponível 24 horas por dia, 7 dias por semana. No entanto, não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas, que serão comunicadas com antecedência razoável." },
        { type: "p", text: "Não seremos responsáveis por interrupções do Serviço causadas por: manutenção programada, falhas de infraestrutura de terceiros (provedores de nuvem, APIs externas), causas de força maior ou ataques externos." },
        { type: "p", text: "Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer funcionalidade. Para descontinuações que afetem significativamente o Serviço contratado, notificaremos com pelo menos 30 dias de antecedência e ofereceremos reembolso proporcional quando aplicável." },
      ],
    },
    {
      id: "10",
      title: "10. Limitação de Responsabilidade",
      blocks: [
        { type: "p", text: "O Serviço é fornecido \"como está\" e \"conforme disponível\", sem garantias de qualquer tipo, expressas ou implícitas, incluindo garantias de comercialização, adequação a um propósito específico ou não violação." },
        { type: "p", text: "Na medida máxima permitida pela legislação aplicável, a Elite Tube LLC, seus diretores, funcionários, parceiros e fornecedores não serão responsáveis por danos indiretos, incidentais, especiais, consequentes ou punitivos, perda de lucros, dados, reputação ou oportunidades de negócios." },
        { type: "p", text: "Nossa responsabilidade total não excederá o valor efetivamente pago pelo usuário à Elite Labs nos 3 meses anteriores ao evento que originou a reclamação, ou 100 USD se não houver pagamentos nesse período." },
      ],
    },
    {
      id: "11",
      title: "11. Indenização",
      blocks: [
        { type: "p", text: "Você concorda em indenizar, defender e isentar a Elite Tube LLC, suas afiliadas, diretores, funcionários e agentes de qualquer reclamação, dano, perda, responsabilidade, custo ou despesa (incluindo honorários advocatícios razoáveis) decorrente de:" },
        {
          type: "ul",
          items: [
            "Seu uso do Serviço em violação destes Termos.",
            "O conteúdo que você gera ou envia através do Serviço.",
            "Sua violação de direitos de terceiros.",
            "Sua violação da legislação aplicável.",
          ],
        },
      ],
    },
    {
      id: "12",
      title: "12. Suspensão e Rescisão",
      blocks: [
        { type: "p", text: "Você pode cancelar sua conta a qualquer momento pelo painel da conta ou entrando em contato com soporte@elitelabs.es. O cancelamento entra em vigor no final do período de faturamento em curso." },
        { type: "p", text: "A Elite Labs pode suspender ou cancelar sua conta imediatamente, com ou sem aviso prévio, se você violar estes Termos, realizar atividades fraudulentas ou ilegais, sua conta representar um risco de segurança ou mediante ordem judicial." },
        { type: "p", text: "Após a rescisão: você cessará o uso do Serviço; os créditos não utilizados serão perdidos (salvo direito legal ao reembolso); as disposições que por sua natureza devam sobreviver (propriedade intelectual, limitação de responsabilidade, indenização, legislação aplicável) continuarão em vigor." },
      ],
    },
    {
      id: "13",
      title: "13. Arbitragem e Resolução de Disputas",
      subsections: [
        {
          id: "13.1",
          title: "13.1 Acordo de arbitragem",
          blocks: [{ type: "p", text: "SALVO PROIBIÇÃO PELA LEI APLICÁVEL, QUALQUER DISPUTA, RECLAMAÇÃO OU CONTROVÉRSIA RELACIONADA COM ESTES TERMOS OU O SERVIÇO SERÁ RESOLVIDA POR ARBITRAGEM INDIVIDUAL VINCULANTE, E NÃO PERANTE UM TRIBUNAL." }],
        },
        {
          id: "13.2",
          title: "13.2 Procedimento",
          blocks: [{ type: "p", text: "A arbitragem será conduzida de acordo com as regras da American Arbitration Association (AAA), em inglês ou espanhol conforme acordado pelas partes, em Tampa, Flórida, EUA, ou de forma remota." }],
        },
        {
          id: "13.3",
          title: "13.3 Renúncia a ações coletivas",
          blocks: [{ type: "p", text: "AS PARTES RENUNCIAM AO DIREITO DE PARTICIPAR EM AÇÕES COLETIVAS (CLASS ACTIONS). SOMENTE RECLAMAÇÕES INDIVIDUAIS SÃO PERMITIDAS." }],
        },
        {
          id: "13.4",
          title: "13.4 Exceções",
          blocks: [
            { type: "p", text: "Não obstante o acima, qualquer das partes pode recorrer a um tribunal para:" },
            { type: "ul", items: ["Solicitar medidas cautelares urgentes.", "Reclamações de propriedade intelectual.", "Reclamações de valor inferior a 10.000 USD perante tribunais de pequenas causas."] },
          ],
        },
        {
          id: "13.5",
          title: "13.5 Usuários na União Europeia",
          blocks: [{ type: "p", text: "Os usuários residentes na UE conservam seus direitos legais de acesso aos tribunais ordinários do seu país de residência, conforme a legislação europeia imperativa. A Comissão Europeia oferece uma plataforma de resolução de litígios online: ec.europa.eu/consumers/odr." }],
        },
      ],
    },
    {
      id: "14",
      title: "14. Legislação Aplicável e Jurisdição",
      blocks: [
        { type: "p", text: "Estes Termos são regidos pelas leis do Estado da Flórida (EUA), sem prejuízo das normas sobre conflitos de leis. Para disputas não sujeitas ao acordo de arbitragem, as partes submetem-se à jurisdição exclusiva dos tribunais do condado de Hillsborough, Flórida, EUA." },
        { type: "p", text: "Os usuários na União Europeia conservam os direitos reconhecidos pela legislação imperativa do seu país de residência, incluindo as normas de proteção ao consumidor." },
      ],
    },
    {
      id: "15",
      title: "15. Disposições Gerais",
      blocks: [
        { type: "p", text: "Estes Termos, juntamente com a Política de Privacidade e a Política de Cookies, constituem o acordo completo entre as partes em relação ao Serviço e substituem quaisquer acordos anteriores." },
        { type: "p", text: "Se alguma disposição for declarada inválida ou inexequível, as restantes permanecerão em vigor. A falta de exercício de qualquer direito não constitui renúncia. Não pode ceder seus direitos sem consentimento prévio por escrito da Elite Labs. A Elite Labs não será responsável por atrasos causados por circunstâncias fora do seu controle razoável. Em caso de discrepância entre versões em diferentes idiomas, prevalecerá a versão em inglês." },
      ],
    },
    {
      id: "16",
      title: "16. Contato",
      blocks: [
        { type: "p", text: "Para qualquer consulta, reclamação ou exercício de direitos relacionados com estes Termos:" },
        {
          type: "ul",
          items: [
            "Elite Tube LLC",
            "4111 Hollow Trail Dr, Suite 3624, Tampa, Flórida 33624, EUA",
            "soporte@elitelabs.es",
            "elitelabs.es",
          ],
        },
        { type: "p", text: "Prazo de resposta: máximo de 5 dias úteis." },
        { type: "p", text: "Estes Termos de Uso entram em vigor em 24 de junho de 2026 e substituem todas as versões anteriores." },
      ],
    },
  ],
};

const CONTENT: Record<Lang, TermsContent> = { es, en, de, fr, pt };

// ─── Renderer helpers ─────────────────────────────────────────────────────────

function isUppercase(text: string) {
  return text === text.toUpperCase() && text.length > 40;
}

function RenderBlock({ block }: { block: Block }) {
  if (block.type === "p") {
    return (
      <p
        className="text-sm leading-relaxed"
        style={{
          color: "#9ca3af",
          ...(isUppercase(block.text) ? { color: "#d1d5db", fontWeight: 600, letterSpacing: "0.01em" } : {}),
        }}
      >
        {block.text}
      </p>
    );
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
  if (block.type === "group") {
    return (
      <div className="mt-3">
        <p className="text-sm font-semibold mb-2" style={{ color: "#d1d5db" }}>{block.title}</p>
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#9ca3af" }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#6b7280" }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

function RenderSection({ section }: { section: Section }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-4">{section.title}</h2>
      {section.blocks && (
        <div className="space-y-3">
          {section.blocks.map((b, i) => <RenderBlock key={i} block={b} />)}
        </div>
      )}
      {section.subsections && (
        <div className="space-y-6 mt-1">
          {section.subsections.map((sub) => (
            <div key={sub.id}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#e5e7eb" }}>{sub.title}</h3>
              <div className="space-y-3">
                {sub.blocks.map((b, i) => <RenderBlock key={i} block={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
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
              <button
                key={l.code}
                onClick={() => { onChange(l.code); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "7px 10px", borderRadius: "8px",
                  border: "none", cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.08)" : "transparent",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.6)",
                  fontSize: "13px",
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

export default function TermsPage() {
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
      <header
        className="border-b sticky top-0 z-10"
        style={{ background: "rgba(10,10,15,0.95)", backdropFilter: "blur(12px)", borderColor: "#222222" }}
      >
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/elitelabs.png"
              alt="Elite Labs"
              width={28}
              height={28}
              style={{ height: "28px", width: "auto", objectFit: "contain" }}
              className="rounded-lg"
            />
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
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#888888" }}>
            {c.legalLabel}
          </p>
          <h1 className="text-4xl font-bold text-white mb-3">{c.pageTitle}</h1>
          <p className="text-sm mb-1" style={{ color: "#888888" }}>{c.lastUpdated}</p>
          <p className="text-xs" style={{ color: "#555570" }}>{c.company}</p>
        </div>

        <div
          className="p-5 rounded-xl border mb-10 text-sm leading-relaxed"
          style={{
            background: "#1a1a1a",
            borderLeft: "3px solid rgba(255,255,255,0.2)",
            borderColor: "#222222",
            color: "#cccccc",
          }}
        >
          {c.introBanner}
        </div>

        <div className="space-y-10">
          {c.sections.map((section) => (
            <RenderSection key={section.id} section={section} />
          ))}
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
              {{ es: "Política de privacidad", en: "Privacy Policy", de: "Datenschutzrichtlinie", fr: "Politique de confidentialité", pt: "Política de privacidade" }[lang]}
            </Link>
            <Link href="/support" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
              {{ es: "Soporte", en: "Support", de: "Support", fr: "Support", pt: "Suporte" }[lang]}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
