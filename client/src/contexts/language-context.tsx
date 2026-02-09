import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Traducciones
const translations: Record<Language, Record<string, string>> = {
  es: {
    // Header
    'header.login': 'Iniciar Sesión',
    'header.tryFree': 'Prueba Gratis',
    'header.menu': 'Menú',
    'header.darkMode': 'Modo Oscuro',
    'header.lightMode': 'Modo Claro',
    
    // Landing Page
    'landing.poweredBy': 'Potenciado por Inteligencia Artificial',
    'landing.mainHeading': 'Información Jurídica en Segundos',
    'landing.subtitle': 'La plataforma de búsqueda inteligente que transforma la manera en que los abogados mexicanos investigan precedentes legales.',
    'landing.searchPlaceholder': 'Buscar jurisprudencias, tesis, precedentes...',
    'landing.searchButton': 'Buscar',
    'landing.startFreeTrial': 'Comenzar Prueba Gratuita',
    'landing.trust.resolutions': '+500,000 resoluciones',
    'landing.trust.daily': 'Actualización diaria',
    'landing.trust.accuracy': '99.9% de precisión',
    
    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Búsqueda',
    'nav.history': 'Historial',
    'nav.features': 'Características',
    'nav.howItWorks': 'Cómo Funciona',
    'nav.pricing': 'Precios',
    'nav.testimonials': 'Testimonios',
    
    // Search Page
    'search.title': 'Búsqueda',
    'search.description1': 'Esta herramienta utiliza Inteligencia Artificial (AI) y tecnología RAG (Retrieval-Augmented Generation) para buscar y analizar automáticamente miles de tesis y precedentes, proporcionándote respuestas precisas y fundamentadas.',
    'search.description2': 'Escribe tu pregunta jurídica en lenguaje natural. Sé específico para obtener mejores resultados.',
    'search.questionLabel': 'Tu pregunta jurídica',
    'search.questionPlaceholder': 'Ejemplo: ¿Cuándo procede el amparo directo? ¿Qué requisitos debe cumplir?',
    'search.button': 'Buscar',
    'search.generating': 'Generando...',
    'search.buttonFull': 'Buscar y generar respuesta',
    'search.examples': 'Ejemplos de preguntas',
    'search.backHome': 'Volver al inicio',
    'search.answer': 'Respuesta',
    'search.confidence': 'Confianza',
    'search.confidence.high': 'Alta',
    'search.confidence.medium': 'Media',
    'search.confidence.low': 'Baja',
    'search.withEvidence': 'Con evidencia',
    'search.withoutEvidence': 'Sin evidencia suficiente',
    'search.tesisSupport': 'Fuentes que respaldan la respuesta',
    'search.relevance': 'Relevancia',
    'search.viewFull': 'Ver tesis completa',
    'search.viewPrecedente': 'Ver precedente completo',
    'search.sourceTesis': 'Tesis',
    'search.sourcePrecedente': 'Precedente',
    'search.limitedEvidence': 'Evidencia limitada',
    'search.limitedEvidenceDesc': 'No se encontró jurisprudencia directamente aplicable a esta pregunta. Se recomienda reformular la consulta con términos jurídicos más específicos.',
    'search.questionTooShort': 'Pregunta muy corta',
    'search.questionTooShortDesc': 'Por favor proporcione una pregunta más detallada.',
    'search.showFormalCitation': 'Ver cita formal completa',
    'search.copyCitation': 'Copiar cita formal',
    'search.error': 'Error al procesar',
    'search.errorDesc': 'No se pudo generar la respuesta. Verifica tu conexión e intenta de nuevo.',
    
    // Tesis Detail Page
    'tesis.tabs.executive': 'Resumen Ejecutivo',
    'tesis.tabs.text': 'Texto Oficial',
    'tesis.tabs.usage': 'Cómo Usarla',
    'tesis.whatItSays': 'Qué dice la tesis',
    'tesis.relevance': 'Relevancia',
    'tesis.data': 'Datos de la tesis',
    'tesis.organ': 'Órgano',
    'tesis.matter': 'Materia',
    'tesis.epoch': 'Época',
    'tesis.source': 'Fuente',
    'tesis.year': 'Año',
    'tesis.viewOfficial': 'Ver en fuente oficial',
    'tesis.copy': 'Copiar',
    'tesis.copied': 'Copiado',
    'tesis.copyText': 'El texto de la tesis ha sido copiado.',
    'tesis.copyArgument': 'El argumento ha sido copiado.',
    'tesis.copyCitation': 'La cita formal ha sido copiada.',
    'tesis.fullText': 'Texto íntegro',
    'tesis.conservativeArgument': 'Ejemplo de argumento conservador',
    'tesis.formalCitation': 'Cita formal',
    'tesis.useInDocument': 'Usar esta tesis en mi escrito',
    'tesis.notFound': 'Tesis no encontrada',
    'tesis.notFoundDesc': 'La tesis solicitada no existe o no está disponible.',
    'tesis.back': 'Volver',
    'tesis.general': 'General',
    
    // Precedente Detail Page
    'precedente.badge': 'Precedente Judicial',
    'precedente.tabs.text': 'Texto de Publicación',
    'precedente.tabs.citation': 'Cita Formal',
    'precedente.tabs.votes': 'Votos',
    'precedente.fullText': 'Texto íntegro',
    'precedente.formalCitation': 'Cita formal',
    'precedente.votes': 'Votos de los ministros',
    'precedente.copy': 'Copiar',
    'precedente.copied': 'Copiado',
    'precedente.copyText': 'El texto del precedente ha sido copiado.',
    'precedente.copyCitation': 'La cita formal ha sido copiada.',
    'precedente.data': 'Datos del precedente',
    'precedente.court': 'Sala',
    'precedente.caseType': 'Tipo de asunto',
    'precedente.docket': 'Expediente',
    'precedente.petitioner': 'Promovente',
    'precedente.location': 'Localización',
    'precedente.publishDate': 'Fecha de publicación',
    'precedente.iusRegistry': 'Registro IUS',
    'precedente.topics': 'Temas',
    'precedente.viewOfficial': 'Ver en fuente oficial',
    'precedente.notFound': 'Precedente no encontrado',
    'precedente.notFoundDesc': 'El precedente solicitado no existe o no está disponible.',
    'precedente.back': 'Volver',

    // Landing Sections
    'landing.features': 'Características',
    'landing.testimonials': 'Testimonios',
    'landing.footer.tagline': 'Inteligencia artificial al servicio de la justicia mexicana.',
    'landing.footer.product': 'Producto',
    'landing.footer.company': 'Empresa',
    'landing.footer.legal': 'Legal',
    'landing.footer.integrations': 'Integraciones',
    'landing.footer.about': 'Nosotros',
    'landing.footer.blog': 'Blog',
    'landing.footer.careers': 'Carreras',
    'landing.footer.contact': 'Contacto',
    'landing.footer.terms': 'Términos de Servicio',
    'landing.footer.privacy': 'Privacidad',
    'landing.footer.legalNotice': 'Aviso Legal',
    'landing.footer.rights': 'Todos los derechos reservados.',
    'landing.footer.madeIn': 'Hecho con 🇲🇽 en México',
    
    // Common
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.close': 'Cerrar',
  },
  en: {
    // Header
    'header.login': 'Log In',
    'header.tryFree': 'Try Free',
    'header.menu': 'Menu',
    'header.darkMode': 'Dark Mode',
    'header.lightMode': 'Light Mode',
    
    // Landing Page
    'landing.poweredBy': 'Powered by Artificial Intelligence',
    'landing.mainHeading': 'Legal Information in Seconds',
    'landing.subtitle': 'The intelligent search platform that transforms how Mexican lawyers research legal precedents.',
    'landing.searchPlaceholder': 'Search jurisprudence, theses, precedents...',
    'landing.searchButton': 'Search',
    'landing.startFreeTrial': 'Start Free Trial',
    'landing.trust.resolutions': '+500,000 resolutions',
    'landing.trust.daily': 'Daily updates',
    'landing.trust.accuracy': '99.9% accuracy',
    
    // Navigation
    'nav.home': 'Home',
    'nav.search': 'Search',
    'nav.history': 'History',
    'nav.features': 'Features',
    'nav.howItWorks': 'How It Works',
    'nav.pricing': 'Pricing',
    'nav.testimonials': 'Testimonials',
    
    // Search Page
    'search.title': 'Search',
    'search.description1': 'This tool uses Artificial Intelligence (AI) and RAG (Retrieval-Augmented Generation) technology to automatically search and analyze thousands of theses and precedents, providing you with precise and well-founded answers.',
    'search.description2': 'Write your legal question in natural language. Be specific to get better results.',
    'search.questionLabel': 'Your legal question',
    'search.questionPlaceholder': 'Example: When does direct amparo proceed? What requirements must be met?',
    'search.button': 'Search',
    'search.generating': 'Generating...',
    'search.buttonFull': 'Search and generate answer',
    'search.examples': 'Example questions',
    'search.backHome': 'Back to home',
    'search.answer': 'Answer',
    'search.confidence': 'Confidence',
    'search.confidence.high': 'High',
    'search.confidence.medium': 'Medium',
    'search.confidence.low': 'Low',
    'search.withEvidence': 'With evidence',
    'search.withoutEvidence': 'Insufficient evidence',
    'search.tesisSupport': 'Sources supporting the answer',
    'search.relevance': 'Relevance',
    'search.viewFull': 'View full thesis',
    'search.viewPrecedente': 'View full precedent',
    'search.sourceTesis': 'Thesis',
    'search.sourcePrecedente': 'Precedent',
    'search.limitedEvidence': 'Limited evidence',
    'search.limitedEvidenceDesc': 'No directly applicable jurisprudence was found for this question. It is recommended to reformulate the query with more specific legal terms.',
    'search.questionTooShort': 'Question too short',
    'search.questionTooShortDesc': 'Please provide a more detailed question.',
    'search.showFormalCitation': 'Show full formal citation',
    'search.copyCitation': 'Copy formal citation',
    'search.error': 'Processing error',
    'search.errorDesc': 'Could not generate the answer. Check your connection and try again.',
    
    // Tesis Detail Page
    'tesis.tabs.executive': 'Executive Summary',
    'tesis.tabs.text': 'Official Text',
    'tesis.tabs.usage': 'How to Use It',
    'tesis.whatItSays': 'What the thesis says',
    'tesis.relevance': 'Relevance',
    'tesis.data': 'Thesis data',
    'tesis.organ': 'Organ',
    'tesis.matter': 'Matter',
    'tesis.epoch': 'Epoch',
    'tesis.source': 'Source',
    'tesis.year': 'Year',
    'tesis.viewOfficial': 'View in official source',
    'tesis.copy': 'Copy',
    'tesis.copied': 'Copied',
    'tesis.copyText': 'The thesis text has been copied.',
    'tesis.copyArgument': 'The argument has been copied.',
    'tesis.copyCitation': 'The formal citation has been copied.',
    'tesis.fullText': 'Full text',
    'tesis.conservativeArgument': 'Example of conservative argument',
    'tesis.formalCitation': 'Formal citation',
    'tesis.useInDocument': 'Use this thesis in my document',
    'tesis.notFound': 'Thesis not found',
    'tesis.notFoundDesc': 'The requested thesis does not exist or is not available.',
    'tesis.back': 'Back',
    'tesis.general': 'General',
    
    // Precedente Detail Page
    'precedente.badge': 'Judicial Precedent',
    'precedente.tabs.text': 'Publication Text',
    'precedente.tabs.citation': 'Formal Citation',
    'precedente.tabs.votes': 'Votes',
    'precedente.fullText': 'Full text',
    'precedente.formalCitation': 'Formal citation',
    'precedente.votes': 'Justices\' votes',
    'precedente.copy': 'Copy',
    'precedente.copied': 'Copied',
    'precedente.copyText': 'The precedent text has been copied.',
    'precedente.copyCitation': 'The formal citation has been copied.',
    'precedente.data': 'Precedent data',
    'precedente.court': 'Court',
    'precedente.caseType': 'Case type',
    'precedente.docket': 'Docket number',
    'precedente.petitioner': 'Petitioner',
    'precedente.location': 'Location',
    'precedente.publishDate': 'Publication date',
    'precedente.iusRegistry': 'IUS Registry',
    'precedente.topics': 'Topics',
    'precedente.viewOfficial': 'View in official source',
    'precedente.notFound': 'Precedent not found',
    'precedente.notFoundDesc': 'The requested precedent does not exist or is not available.',
    'precedente.back': 'Back',

    // Landing Sections
    'landing.features': 'Features',
    'landing.testimonials': 'Testimonials',
    'landing.footer.tagline': 'Artificial intelligence at the service of Mexican justice.',
    'landing.footer.product': 'Product',
    'landing.footer.company': 'Company',
    'landing.footer.legal': 'Legal',
    'landing.footer.integrations': 'Integrations',
    'landing.footer.about': 'About Us',
    'landing.footer.blog': 'Blog',
    'landing.footer.careers': 'Careers',
    'landing.footer.contact': 'Contact',
    'landing.footer.terms': 'Terms of Service',
    'landing.footer.privacy': 'Privacy',
    'landing.footer.legalNotice': 'Legal Notice',
    'landing.footer.rights': 'All rights reserved.',
    'landing.footer.madeIn': 'Made with 🇲🇽 in Mexico',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.close': 'Close',
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('atenea_language');
      if (saved === 'es' || saved === 'en') {
        return saved;
      }
    }
    return 'es'; // Default to Spanish
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('atenea_language', lang);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Memoizar el valor del contexto para evitar recreaciones innecesarias
  const contextValue = React.useMemo(
    () => ({ language, setLanguage, t }),
    [language]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // En desarrollo, dar más información sobre el error
    if (process.env.NODE_ENV === 'development') {
      console.error('useLanguage called outside LanguageProvider. Make sure LanguageProvider wraps your component tree.');
    }
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
