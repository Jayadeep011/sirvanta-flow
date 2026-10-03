// src/i18n.js
// Light translation layer for navigation and workspace chrome (English, Spanish, German, French).
// Module screens (calculators, tables, long help text) are still English.

import { useStore } from './store';

const DICT = {
  en: {
    'nav.dashboard': 'Dashboard Overview', 'nav.safe': 'Safe-to-Spend Engine', 'nav.salary': 'Virtual Salary',
    'nav.tax': 'Tax Vault', 'nav.clients': 'Client Matrix', 'nav.advisor': 'AI Advisor',
    'nav.parser': 'Statement Parser', 'nav.docs': 'User Manual & Docs', 'nav.settings': 'Settings',
    'ui.search': 'Search or jump to…', 'ui.upgrade': 'Upgrade', 'ui.plan': 'Plan', 'ui.collapse': 'Collapse sidebar',
    'ui.expand': 'Expand sidebar', 'ui.workspace': 'Workspace', 'ui.addAgency': '+ Add Agency Workspace', 'ui.app': 'App',
    'ui.country': 'Country / tax jurisdiction', 'ui.currency': 'Currency', 'ui.language': 'Language',
    'pub.features': 'Features', 'pub.pricing': 'Pricing', 'pub.security': 'Security', 'pub.about': 'About',
    'pub.launch': 'Launch Workspace', 'pub.sandbox': 'Interactive Sandbox Demo',
    'set.profile': 'Profile & Account', 'set.plan': 'Plan & Billing', 'set.regional': 'Regional & Currency', 'set.data': 'Data & Local Sync',
  },
  es: {
    'nav.dashboard': 'Panel general', 'nav.safe': 'Motor de gasto seguro', 'nav.salary': 'Salario virtual',
    'nav.tax': 'Bóveda fiscal', 'nav.clients': 'Matriz de clientes', 'nav.advisor': 'Asesor de IA',
    'nav.parser': 'Importador de extractos', 'nav.docs': 'Manual y documentación', 'nav.settings': 'Configuración',
    'ui.search': 'Buscar o ir a…', 'ui.upgrade': 'Mejorar', 'ui.plan': 'Plan', 'ui.collapse': 'Contraer barra lateral',
    'ui.expand': 'Expandir barra lateral', 'ui.workspace': 'Espacio de trabajo', 'ui.addAgency': '+ Añadir espacio de agencia', 'ui.app': 'App',
    'ui.country': 'País / jurisdicción fiscal', 'ui.currency': 'Moneda', 'ui.language': 'Idioma',
    'pub.features': 'Funciones', 'pub.pricing': 'Precios', 'pub.security': 'Seguridad', 'pub.about': 'Nosotros',
    'pub.launch': 'Abrir espacio de trabajo', 'pub.sandbox': 'Demo interactiva',
    'set.profile': 'Perfil y cuenta', 'set.plan': 'Plan y facturación', 'set.regional': 'Región y moneda', 'set.data': 'Datos y sincronización local',
  },
  de: {
    'nav.dashboard': 'Übersicht', 'nav.safe': 'Safe-to-Spend-Engine', 'nav.salary': 'Virtuelles Gehalt',
    'nav.tax': 'Steuer-Tresor', 'nav.clients': 'Kundenmatrix', 'nav.advisor': 'KI-Berater',
    'nav.parser': 'Kontoauszug-Import', 'nav.docs': 'Handbuch & Doku', 'nav.settings': 'Einstellungen',
    'ui.search': 'Suchen oder springen zu…', 'ui.upgrade': 'Upgrade', 'ui.plan': 'Tarif', 'ui.collapse': 'Seitenleiste einklappen',
    'ui.expand': 'Seitenleiste ausklappen', 'ui.workspace': 'Arbeitsbereich', 'ui.addAgency': '+ Agentur-Arbeitsbereich hinzufügen', 'ui.app': 'App',
    'ui.country': 'Land / Steuergebiet', 'ui.currency': 'Währung', 'ui.language': 'Sprache',
    'pub.features': 'Funktionen', 'pub.pricing': 'Preise', 'pub.security': 'Sicherheit', 'pub.about': 'Über uns',
    'pub.launch': 'Arbeitsbereich starten', 'pub.sandbox': 'Interaktive Sandbox-Demo',
    'set.profile': 'Profil & Konto', 'set.plan': 'Tarif & Abrechnung', 'set.regional': 'Region & Währung', 'set.data': 'Daten & lokale Synchronisierung',
  },
  fr: {
    'nav.dashboard': 'Tableau de bord', 'nav.safe': 'Moteur de dépenses sûres', 'nav.salary': 'Salaire virtuel',
    'nav.tax': 'Coffre fiscal', 'nav.clients': 'Matrice clients', 'nav.advisor': 'Conseiller IA',
    'nav.parser': 'Import de relevés', 'nav.docs': 'Manuel et documentation', 'nav.settings': 'Paramètres',
    'ui.search': 'Rechercher ou aller à…', 'ui.upgrade': 'Mettre à niveau', 'ui.plan': 'Forfait', 'ui.collapse': 'Réduire la barre latérale',
    'ui.expand': 'Développer la barre latérale', 'ui.workspace': 'Espace de travail', 'ui.addAgency': '+ Ajouter un espace agence', 'ui.app': 'App',
    'ui.country': 'Pays / juridiction fiscale', 'ui.currency': 'Devise', 'ui.language': 'Langue',
    'pub.features': 'Fonctionnalités', 'pub.pricing': 'Tarifs', 'pub.security': 'Sécurité', 'pub.about': 'À propos',
    'pub.launch': "Lancer l'espace de travail", 'pub.sandbox': 'Démo interactive',
    'set.profile': 'Profil et compte', 'set.plan': 'Forfait et facturation', 'set.regional': 'Région et devise', 'set.data': 'Données et synchronisation locale',
  },
};

export const translate = (lang, key) => (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;

/** const t = useT(); t('nav.tax') */
export function useT() {
  const lang = useStore((s) => s.language);
  return (key) => translate(lang, key);
}
