'use client'

import { useEffect, useState } from 'react'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Ressources de traduction
const resources = {
  en: {
    translation: {
      // Navigation
      nav: {
        dashboard: 'Dashboard',
        profile: 'Profile',
        globalTickets: 'Global Tickets',
        trashedTickets: 'Trashed Tickets',
        users: 'Users',
        liveChat: 'Live Chat',
        reports: 'Reports',
        myTickets: 'My Tickets',
        availableTickets: 'Available Tickets',
        clientChat: 'Client Chat',
        resolvedTickets: 'Resolved Tickets',
        logout: 'Logout',
        account: 'Account',
        billing: 'Billing',
        createTicket: 'Create Ticket',
        faq: 'FAQ',
        subscription: 'Subscription',
        tickets: 'Tickets'
      },
      // Dashboard commun
      dashboard: {
        welcome: 'Welcome back, {{name}}!',
        welcomeDefault: 'Welcome back!',
        subtitle: "Here's what's happening with your helpdesk today.",
        hello: 'Hello {{name}}!',
        welcomeMessage: "Here's an overview of your activity and important information.",
        totalTickets: 'Total tickets',
        openTickets: 'Open tickets',
        resolvedTickets: 'Resolved Tickets',
        totalCustomers: 'Total Customers',
        pendingTickets: 'Pending',
        closedTickets: 'Closed',
        recentTickets: 'Recent Tickets',
        latestTickets: 'Latest tickets from the last 30 days',
        viewAll: 'View All',
        searchTickets: 'Search tickets...',
        noTicketsFound: 'No tickets found.',
        priorityTickets: 'Priority tickets',
        urgent: 'urgent',
        noUrgentTickets: 'No urgent tickets at the moment',
        quickActions: 'Quick Actions',
        createNewTicket: 'Create New Ticket',
        viewAllTickets: 'View All Tickets',
        manageDeletedTickets: 'Manage deleted tickets - restore or permanently remove'
      },
      // Formulaires et actions
      actions: {
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        export: 'Export',
        add: 'Add',
        addUser: 'Add User',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        submit: 'Submit',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        confirm: 'Confirm',
        close: 'Close',
        view: 'View',
        assign: 'Assign',
        assignAgent: 'Assign agent',
        newTicket: 'New Ticket',
        newConversation: 'New Conversation',
        new: 'New',
        selectAgent: 'Select an agent'
      },
      // Tickets
      tickets: {
        ticketId: 'Ticket ID',
        customer: 'Customer',
        subject: 'Subject',
        status: 'Status',
        priority: 'Priority',
        category: 'Category',
        assignedAgent: 'Assigned Agent',
        date: 'Date',
        createdAt: 'Created',
        updatedAt: 'Updated',
        description: 'Description',
        unknown: 'Unknown',
        noSubject: 'No subject',
        selectAgent: 'Select an agent',
        responses: 'Ticket Responses',
        allResponsesFor: 'All responses for ticket',
        viewAndManage: 'View and manage your support tickets.',
        submitNewRequest: 'Submit a new support request to our team.',
        // Status
        open: 'Open',
        pending: 'Pending',
        resolved: 'Resolved',
        closed: 'Closed',
        inProgress: 'In Progress',
        // Priority
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent'
      },
      // Utilisateurs
      users: {
        userManagement: 'User Management',
        manageUsers: 'Manage user accounts, roles and permissions',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        department: 'Department',
        status: 'Status',
        lastLogin: 'Last Login',
        createdAt: 'Created At',
        actions: 'Actions',
        active: 'Active',
        inactive: 'Inactive',
        admin: 'Admin',
        agent: 'Agent',
        client: 'Client',
        superAdmin: 'Super Admin'
      },
      // Profil
      profile: {
        profileSettings: 'Profile Settings',
        personalInfo: 'Manage your personal information and account settings',
        personalInformation: 'Personal Information',
        accountSettings: 'Account Settings',
        securitySettings: 'Security Settings',
        notifications: 'Notifications',
        preferences: 'Preferences',
        language: 'Language',
        timezone: 'Timezone',
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password'
      },
      // Messages et notifications
      messages: {
        title: 'Messages',
        messageSingular: 'message',
        messagesPlural: 'messages',
        noMessages: 'No messages yet',
        startConversation: 'Start the conversation by sending a message below.',
        yourReply: 'Your Reply',
        typeReplyPlaceholder: 'Type your reply here...',
        sending: 'Sending...',
        sendReply: 'Send Reply',
        success: {
          saved: 'Successfully saved!',
          updated: 'Successfully updated!',
          deleted: 'Successfully deleted!',
          created: 'Successfully created!',
          agentAssigned: 'Agent assigned successfully'
        },
        error: {
          generic: 'An error occurred. Please try again.',
          network: 'Network error. Please check your connection.',
          unauthorized: 'You are not authorized to perform this action.',
          notFound: 'Resource not found.',
          validation: 'Please check your input and try again.',
          unknownError: 'Unknown error',
          assignFailed: 'Assignment failed',
          loadingDashboard: 'Error loading dashboard.'
        },
        confirm: {
          delete: 'Are you sure you want to delete this item?',
          logout: 'Are you sure you want to logout?'
        },
        loading: 'Loading...',
        actions: {
          retry: 'Retry'
        }
      },
      // Agent Dashboard
      agent: {
        dashboard: 'Agent Dashboard',
        totalResolved: 'Total resolved',
        resolvedToday: 'Resolved today',
        openTickets: 'Open tickets',
        availableTickets: 'Available tickets',
        priorityTickets: 'Priority Tickets',
        urgent: 'urgent',
        noUrgentTickets: 'No urgent tickets at the moment',
        view: 'view',
        availableTicketsBtn: 'Available Tickets',
        myTicketsBtn: 'My Tickets',
        newTicketBtn: 'New Ticket'
      },
      // Client Dashboard
      client: {
        dashboard: 'Client Dashboard',
        totalTickets: 'Total tickets',
        open: 'Open',
        pending: 'Pending',
        resolvedClosed: 'Resolved/Closed',
        recentTickets: 'Recent Tickets',
        viewAll: 'View all',
        quickActions: 'Quick Actions',
        createTicket: 'Create New Ticket',
        noRecentTickets: 'No recent tickets',
        checkTickets: 'Check your tickets page for all activity'
      },
      // Chat
      chat: {
        getInstantHelp: 'Get instant help from our support team.'
      },
      // FAQ
      faq: {
        findQuickAnswers: 'Find quick answers to common questions.'
      },
      // Billing
      billing: {
        manageInvoices: 'Manage your invoices and payment methods.'
      },
      // Subscription
      subscription: {
        managePlan: 'Manage your subscription plan and features.'
      },
      // Account
      account: {
        updateInfo: 'Update your personal information and preferences.'
      },
      // Common
      common: {
        client: 'client'
      }
    }
  },
  fr: {
    translation: {
      // Navigation
      nav: {
        dashboard: 'Tableau de bord',
        profile: 'Profil',
        globalTickets: 'Tickets globaux',
        trashedTickets: 'Tickets supprimés',
        users: 'Utilisateurs',
        liveChat: 'Chat en direct',
        reports: 'Rapports',
        myTickets: 'Mes tickets',
        availableTickets: 'Tickets disponibles',
        clientChat: 'Chat client',
        resolvedTickets: 'Tickets résolus',
        logout: 'Déconnexion',
        account: 'Compte',
        billing: 'Facturation',
        createTicket: 'Créer un ticket',
        faq: 'FAQ',
        subscription: 'Abonnement',
        tickets: 'Tickets'
      },
      // Dashboard commun
      dashboard: {
        welcome: 'Bon retour, {{name}} !',
        welcomeDefault: 'Bon retour !',
        subtitle: 'Voici ce qui se passe avec votre service d\'assistance aujourd\'hui.',
        hello: 'Bonjour {{name}} !',
        welcomeMessage: 'Voici un aperçu de votre activité et des informations importantes.',
        totalTickets: 'Total tickets',
        openTickets: 'Tickets ouverts',
        resolvedTickets: 'Tickets résolus',
        totalCustomers: 'Total clients',
        pendingTickets: 'En attente',
        closedTickets: 'Fermés',
        recentTickets: 'Tickets récents',
        latestTickets: 'Derniers tickets des 30 derniers jours',
        viewAll: 'Voir tout',
        searchTickets: 'Rechercher des tickets...',
        noTicketsFound: 'Aucun ticket trouvé.',
        priorityTickets: 'Tickets prioritaires',
        urgent: 'urgent',
        noUrgentTickets: 'Aucun ticket urgent pour le moment',
        quickActions: 'Actions rapides',
        createNewTicket: 'Créer un nouveau ticket',
        viewAllTickets: 'Voir tous les tickets',
        manageDeletedTickets: 'Gérer les tickets supprimés - restaurer ou supprimer définitivement'
      },
      // Formulaires et actions
      actions: {
        search: 'Rechercher',
        filter: 'Filtrer',
        sort: 'Trier',
        export: 'Exporter',
        add: 'Ajouter',
        addUser: 'Ajouter un utilisateur',
        edit: 'Modifier',
        delete: 'Supprimer',
        save: 'Enregistrer',
        cancel: 'Annuler',
        submit: 'Soumettre',
        back: 'Retour',
        next: 'Suivant',
        previous: 'Précédent',
        confirm: 'Confirmer',
        close: 'Fermer',
        view: 'Voir',
        assign: 'Assigner',
        assignAgent: 'Assigner un agent',
        newTicket: 'Nouveau ticket',
        newConversation: 'Nouvelle conversation',
        new: 'Nouveau',
        selectAgent: 'Sélectionner un agent'
      },
      // Tickets
      tickets: {
        ticketId: 'ID Ticket',
        customer: 'Client',
        subject: 'Sujet',
        status: 'Statut',
        priority: 'Priorité',
        category: 'Catégorie',
        assignedAgent: 'Agent assigné',
        date: 'Date',
        createdAt: 'Créé le',
        updatedAt: 'Modifié le',
        description: 'Description',
        unknown: 'Inconnu',
        noSubject: 'Aucun sujet',
        selectAgent: 'Sélectionner un agent',
        responses: 'Réponses du ticket',
        allResponsesFor: 'Toutes les réponses pour le ticket',
        viewAndManage: 'Voir et gérer vos tickets de support.',
        submitNewRequest: 'Soumettre une nouvelle demande de support à notre équipe.',
        // Status
        open: 'Ouvert',
        pending: 'En attente',
        resolved: 'Résolu',
        closed: 'Fermé',
        inProgress: 'En cours',
        // Priority
        low: 'Faible',
        medium: 'Moyenne',
        high: 'Élevée',
        urgent: 'Urgent'
      },
      // Utilisateurs
      users: {
        userManagement: 'Gestion des utilisateurs',
        manageUsers: 'Gérer les comptes utilisateurs, rôles et permissions',
        name: 'Nom',
        email: 'Email',
        role: 'Rôle',
        department: 'Département',
        status: 'Statut',
        lastLogin: 'Dernière connexion',
        createdAt: 'Créé le',
        actions: 'Actions',
        active: 'Actif',
        inactive: 'Inactif',
        admin: 'Administrateur',
        agent: 'Agent',
        client: 'Client',
        superAdmin: 'Super Administrateur'
      },
      // Profil
      profile: {
        profileSettings: 'Paramètres du profil',
        personalInfo: 'Gérez vos informations personnelles et paramètres de compte',
        personalInformation: 'Informations personnelles',
        accountSettings: 'Paramètres du compte',
        securitySettings: 'Paramètres de sécurité',
        notifications: 'Notifications',
        preferences: 'Préférences',
        language: 'Langue',
        timezone: 'Fuseau horaire',
        changePassword: 'Changer le mot de passe',
        currentPassword: 'Mot de passe actuel',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le mot de passe'
      },
      // Messages et notifications
      messages: {
        title: 'Messages',
        messageSingular: 'message',
        messagesPlural: 'messages',
        noMessages: 'Aucun message pour le moment',
        startConversation: 'Commencez la conversation en envoyant un message ci-dessous.',
        yourReply: 'Votre réponse',
        typeReplyPlaceholder: 'Tapez votre réponse ici...',
        sending: 'Envoi en cours...',
        sendReply: 'Envoyer une réponse',
        success: {
          saved: 'Enregistré avec succès !',
          updated: 'Mis à jour avec succès !',
          deleted: 'Supprimé avec succès !',
          created: 'Créé avec succès !',
          agentAssigned: 'Agent affecté avec succès'
        },
        error: {
          generic: 'Une erreur s\'est produite. Veuillez réessayer.',
          network: 'Erreur réseau. Vérifiez votre connexion.',
          unauthorized: 'Vous n\'êtes pas autorisé à effectuer cette action.',
          notFound: 'Ressource non trouvée.',
          validation: 'Veuillez vérifier votre saisie et réessayer.',
          unknownError: 'Erreur inconnue',
          assignFailed: 'Échec de l\'affectation',
          loadingDashboard: 'Impossible de charger le tableau de bord.'
        },
        confirm: {
          delete: 'Êtes-vous sûr de vouloir supprimer cet élément ?',
          logout: 'Êtes-vous sûr de vouloir vous déconnecter ?'
        },
        loading: 'Chargement...',
        actions: {
          retry: 'Réessayer'
        }
      },
      // Agent Dashboard
      agent: {
        dashboard: 'Tableau de bord Agent',
        totalResolved: 'Total résolu',
        resolvedToday: 'Résolu aujourd\'hui',
        openTickets: 'Tickets ouverts',
        availableTickets: 'Tickets disponibles',
        priorityTickets: 'Tickets prioritaires',
        urgent: 'urgent',
        noUrgentTickets: 'Aucun ticket urgent pour le moment',
        view: 'voir',
        availableTicketsBtn: 'Tickets disponibles',
        myTicketsBtn: 'Mes tickets',
        newTicketBtn: 'Nouveau ticket'
      },
      // Client Dashboard
      client: {
        dashboard: 'Tableau de bord Client',
        totalTickets: 'Total tickets',
        open: 'Ouvert',
        pending: 'En attente',
        resolvedClosed: 'Résolu/Fermé',
        recentTickets: 'Tickets récents',
        viewAll: 'Voir tout',
        quickActions: 'Actions rapides',
        createTicket: 'Créer un nouveau ticket',
        noRecentTickets: 'Aucun ticket récent',
        checkTickets: 'Consultez votre page tickets pour toute l\'activité'
      },
      // Chat
      chat: {
        getInstantHelp: 'Obtenez une aide instantanée de notre équipe de support.'
      },
      // FAQ
      faq: {
        findQuickAnswers: 'Trouvez des réponses rapides aux questions courantes.'
      },
      // Billing
      billing: {
        manageInvoices: 'Gérez vos factures et méthodes de paiement.'
      },
      // Subscription
      subscription: {
        managePlan: 'Gérez votre plan d\'abonnement et ses fonctionnalités.'
      },
      // Account
      account: {
        updateInfo: 'Mettez à jour vos informations personnelles et préférences.'
      },
      // Common
      common: {
        client: 'client'
      }
    }
  }
}

interface I18nProviderProps {
  children: React.ReactNode
}

export default function I18nProvider({ children }: I18nProviderProps) {
  const [i18nInitialized, setI18nInitialized] = useState(false)
  const [lang, setLang] = useState(() => i18n.language || 'fr')

  useEffect(() => {
    let mounted = true

    const onLanguageChanged = (lng: string) => {
      try {
        document.documentElement.lang = lng || 'fr'
      } catch (e) {
        // ignore in non-browser env
      }
      setLang(lng)
    }

    if (!i18n.isInitialized) {
      i18n
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
          resources,
          fallbackLng: 'fr',
          debug: false,
          
          detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
          },

          interpolation: {
            escapeValue: false,
          },

          react: {
            useSuspense: false,
          }
        })
        .then(() => {
          if (!mounted) return
          setI18nInitialized(true)
          const current = i18n.language || 'fr'
          setLang(current)
          try {
            document.documentElement.lang = current
          } catch (e) {
            // ignore
          }
        })
    } else {
      setI18nInitialized(true)
      const current = i18n.language || 'fr'
      setLang(current)
      try {
        document.documentElement.lang = current
      } catch (e) {
        // ignore
      }
    }

    // subscribe to language changes so header/lang attribute and children re-render
    i18n.on('languageChanged', onLanguageChanged)

    return () => {
      mounted = false
      i18n.off('languageChanged', onLanguageChanged)
    }
  }, [])

  if (!i18nInitialized) {
    return <div>Loading...</div>
  }

  return <>{children}</>
}
