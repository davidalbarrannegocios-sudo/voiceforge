"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

type Lang = "es" | "en";

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: "es", flag: "https://flagcdn.com/w20/es.png", label: "Español" },
  { code: "en", flag: "https://flagcdn.com/w20/us.png", label: "English" },
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

const CONTENT: Record<Lang, TermsContent> = { es, en };

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
    if (stored && (stored === "es" || stored === "en")) {
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
              {lang === "es" ? "Política de privacidad" : "Privacy Policy"}
            </Link>
            <Link href="/support" className="text-xs transition-colors hover:text-gray-300" style={{ color: "#555570" }}>
              {lang === "es" ? "Soporte" : "Support"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
