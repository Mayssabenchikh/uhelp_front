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
      // Reports (header subtitles / small texts for reports pages)
      reports: {
        viewMetrics: 'View and analyze key metrics across your helpdesk.'
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
        selectAgent: 'Select an agent',
        // Additional action keys used in clientdashboard
        saving: 'Saving...',
        saveChanges: 'Save Changes',
        creating: 'Creating...',
        details: 'Details',
        processing: 'Processing',
        clear: 'Clear',
        list: 'List',
        grid: 'Grid',
        clearFilters: 'Clear filters',
        createNew: 'Create new'
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
        urgent: 'Urgent',
        // Additional keys used in client pages
        unknownStatus: 'Unknown status',
        unknownPriority: 'Unknown priority',
        createNew: 'Create New Ticket',
        createSubtitle: 'Fill in the details below to create a new support ticket',
        createButton: 'Create Ticket',
        title: 'Title',
        titlePlaceholder: 'Enter a descriptive title for your ticket...',
        categoryLabel: 'Category',
        selectCategory: 'Select a category',
        descriptionPlaceholder: 'Describe the issue or request in detail...',
        priorityLevel: 'Priority Level',
        initialStatus: 'Initial Status',
        statusOpen: 'Open',
        statusInProgress: 'In Progress',
        statusResolved: 'Resolved',
        statusClosed: 'Closed',
        tipsTitle: '\uD83D\uDCA1 Tips for Better Support',
        tip1: 'Be specific about the issue',
        tip2: 'Include steps to reproduce',
        tip3: 'Mention your environment',
        tip4: 'Attach relevant screenshots',
        noRecent: 'No recent tickets',
        noRecentDesc: 'You do not have any recent tickets',
        myTickets: 'My Tickets',
        subtitle: 'Manage and track your support requests',
        newTicket: '+ New Ticket',
        total: 'Total',
        highPriority: 'High Priority',
        searchPlaceholder: 'Search by title, ID or description...',
        allStatuses: 'All statuses',
        allPriorities: 'All priorities',
        sort: {
          newest: 'Newest first',
          oldest: 'Oldest first',
          recentlyUpdated: 'Recently updated',
          highPriority: 'High priority first',
          status: 'Status'
        },
        tickets: 'Tickets',
        noTickets: 'No tickets',
        noResults: 'No results',
        noTicketsDesc: "You haven't created any support tickets yet.",
        noResultsDesc: 'No tickets match your search criteria.',
        createFirst: 'Create my first ticket'
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
        enterMessageOrAttachment: 'Please enter a message or attach a file.',
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
      // Chat
      chat: {
        getInstantHelp: 'Get instant help from our support team.',
        // Subtitle used in admin layout header for Live Chat
        monitorAndJoin: 'Monitor ongoing conversations and join when needed.',
        conversations: 'Conversations',
        conversation: 'Conversation',
        activeConversation: 'Active conversation',
        typeMessage: 'Type a message...',
        selectConversation: 'Select a conversation or create a new one'
      },
      // FAQ
      faq: {
        title: 'FAQ',
        findQuickAnswers: 'Find quick answers to common questions.',
        subtitle: "Find answers quickly — ask a question and we'll search the knowledge base.",
        askTitle: 'Ask a question',
        askDescription: "We search the knowledge base first. If no convincing match is found, an AI-generated response may be returned.",
        placeholder: 'Type your question here...',
        searchButton: 'Search',
        clearButton: 'Clear',
        sourceLabel: 'Source',
        confidenceLabel: 'Confidence',
        noAnswer: 'No precise answer found.',
        languageLabel: 'Language',
        loadingFaqs: 'Loading FAQs...',
        noFaqsFound: 'No FAQs found'
      },
      // Billing
      billing: {
        manageInvoices: 'Manage your invoices and payment methods.',
        paymentHistory: 'Payment History',
        managePayments: 'Manage your payments and download invoices',
        searchPlaceholder: 'Search by plan, status, or amount...',
        noResultsSuggestion: "Try adjusting your search criteria to find what you're looking for.",
        noPayments: "You don't have any payment records yet. Your future transactions will appear here.",
        plan: 'Plan',
        amount: 'Amount',
        status: 'Status',
        actions: 'Actions',
        na: 'N/A',
        invoice: 'Invoice',
        payNow: 'Pay Now'
      },
      // Subscription
      subscription: {
        managePlan: 'Manage your subscription plan and features.',
        loadingPlans: 'Loading subscription plans...',
        noPlans: 'No subscription plans available',
        checkBack: 'Please check back later for available plans.',
        choosePlan: 'Choose Your Perfect Plan',
        subtitle: 'Unlock powerful features and take your experience to the next level with our flexible subscription options.',
        activeMessage: 'You currently have an active subscription. You can upgrade, downgrade, or cancel anytime.',
        mostPopular: 'Most Popular',
        currentPlan: 'Current Plan',
        viewFaq: 'View FAQ'
      },
      // Account
      account: {
        updateInfo: 'Update your personal information and preferences.',
        passwordsDoNotMatch: 'Passwords do not match',
        userNotLoaded: 'User not loaded',
        noToken: 'No token found — please login again',
        profileUpdated: 'Profile updated successfully!',
        loadingProfile: 'Loading profile...',
        userName: 'User Name',
        userEmail: 'user@example.com',
        fullName: 'Full Name',
        email: 'Email',
        phone: 'Phone',
        role: 'Role',
        leaveBlank: 'Leave blank to keep current',
        changePassword: 'Change Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password'
      },
      // Common
      common: {
        client: 'client'
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
      // Agent dashboard translations
      agent: {
        totalResolved: 'Total resolved',
        resolvedToday: 'Resolved today',
        openTickets: 'Open tickets',
        availableTickets: 'Available tickets',
        availableTicketsBtn: 'Available Tickets',
        myTicketsBtn: 'My Tickets',
        newTicketBtn: 'New Ticket',
        priorityTickets: 'Priority Tickets',
        urgent: 'urgent',
        noUrgentTickets: 'No urgent tickets at the moment',
        view: 'View'
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
      // Reports (header subtitles / small texts for reports pages)
      reports: {
        viewMetrics: 'Voir et analyser les métriques clés de votre service d\'assistance.'
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
        createNewTicket: 'Créer un Nouveau ticket',
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
        selectAgent: 'Sélectionner un agent',
        // Additional action keys
        saving: 'Enregistrement...',
        saveChanges: 'Enregistrer les modifications',
        creating: 'Création en cours...',
        details: 'Détails',
        processing: 'Traitement',
        clear: 'Effacer',
        list: 'Liste',
        grid: 'Grille',
        clearFilters: 'Effacer les filtres',
        createNew: 'Créer'
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
        urgent: 'Urgent',
        // Additional keys
        unknownStatus: 'Statut inconnu',
        unknownPriority: 'Priorité inconnue',
        createNew: 'Créer un nouveau ticket',
        createSubtitle: 'Remplissez les informations ci-dessous pour créer un nouveau ticket de support',
        createButton: 'Créer un ticket',
        title: 'Titre',
        titlePlaceholder: 'Entrez un titre descriptif pour votre ticket...',
        categoryLabel: 'Catégorie',
        selectCategory: 'Sélectionner une catégorie',
        descriptionPlaceholder: 'Décrivez le problème ou la demande en détail...',
        priorityLevel: 'Niveau de priorité',
        initialStatus: 'Statut initial',
        statusOpen: 'Ouvert',
        statusInProgress: 'En cours',
        statusResolved: 'Résolu',
        statusClosed: 'Fermé',
        tipsTitle: '\uD83D\uDCA1 Conseils pour un meilleur support',
        tip1: 'Soyez précis sur le problème',
        tip2: 'Incluez les étapes pour reproduire',
        tip3: 'Mentionnez votre environnement',
        tip4: 'Joignez des captures d\'écran pertinentes',
        noRecent: 'Aucun ticket récent',
        noRecentDesc: 'Vous n\'avez aucun ticket récent',
        myTickets: 'Mes tickets',
        subtitle: 'Gérez et suivez vos demandes de support',
        newTicket: '+ Nouveau ticket',
        total: 'Total',
        highPriority: 'Haute priorité',
        searchPlaceholder: 'Rechercher par titre, ID ou description...',
        allStatuses: 'Tous les statuts',
        allPriorities: 'Toutes les priorités',
        sort: {
          newest: 'Les plus récents',
          oldest: 'Les plus anciens',
          recentlyUpdated: 'Récemment mis à jour',
          highPriority: 'Priorité élevée en premier',
          status: 'Statut'
        },
        tickets: 'Tickets',
        noTickets: 'Aucun ticket',
        noResults: 'Aucun résultat',
        noTicketsDesc: 'Vous n\'avez pas encore créé de tickets de support.',
        noResultsDesc: 'Aucun ticket ne correspond à vos critères de recherche.',
        createFirst: 'Créer mon premier ticket'
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
        enterMessageOrAttachment: 'Veuillez saisir un message ou joindre un fichier.',
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
      // Chat
      chat: {
        getInstantHelp: 'Obtenez une aide instantanée de notre équipe de support.',
        // Subtitle used in admin layout header for Live Chat
        monitorAndJoin: 'Surveillez les conversations en cours et rejoignez-les si nécessaire.',
        conversations: 'Conversations',
        conversation: 'Conversation',
        activeConversation: 'Conversation active',
        typeMessage: 'Tapez un message...',
        selectConversation: 'Sélectionnez une conversation ou créez-en une nouvelle'
      },
      // FAQ
      faq: {
        title: 'FAQ',
        findQuickAnswers: 'Trouvez des réponses rapides aux questions courantes.',
        subtitle: "Trouvez des réponses rapidement — posez une question et nous chercherons dans la base de connaissances.",
        askTitle: 'Posez une question',
        askDescription: 'Nous recherchons d\'abord dans la base de connaissances. Si aucune correspondance convaincante n\'est trouvée, une réponse générée par l\'IA peut être renvoyée.',
        placeholder: 'Tapez votre question ici...',
        searchButton: 'Rechercher',
        clearButton: 'Effacer',
        sourceLabel: 'Source',
        confidenceLabel: 'Confiance',
        noAnswer: 'Aucune réponse précise trouvée.',
        languageLabel: 'Langue',
        loadingFaqs: 'Chargement des FAQs...',
        noFaqsFound: 'Aucune FAQ trouvée'
      },
      // Billing
      billing: {
        manageInvoices: 'Gérez vos factures et méthodes de paiement.',
        paymentHistory: 'Historique des paiements',
        managePayments: 'Gérez vos paiements et téléchargez les factures',
        searchPlaceholder: 'Rechercher par plan, statut ou montant...',
        noResultsSuggestion: 'Essayez d\'ajuster vos critères de recherche pour trouver ce que vous cherchez.',
        noPayments: 'Vous n\'avez aucun enregistrement de paiement pour le moment. Vos transactions futures apparaîtront ici.',
        plan: 'Plan',
        amount: 'Montant',
        status: 'Statut',
        actions: 'Actions',
        na: 'N/A',
        invoice: 'Facture',
        payNow: 'Payer maintenant'
      },
      // Subscription
      subscription: {
        managePlan: 'Gérez votre plan d\'abonnement et ses fonctionnalités.',
        loadingPlans: 'Chargement des plans d\'abonnement...',
        noPlans: 'Aucun plan d\'abonnement disponible',
        checkBack: 'Veuillez revenir plus tard pour les plans disponibles.',
        choosePlan: 'Choisissez le plan parfait',
        subtitle: 'Débloquez des fonctionnalités puissantes et améliorez votre expérience avec nos options d\'abonnement flexibles.',
        activeMessage: 'Vous avez actuellement un abonnement actif. Vous pouvez mettre à niveau, rétrograder ou annuler à tout moment.',
        mostPopular: 'Le plus populaire',
        currentPlan: 'Plan Actuel',
        viewFaq: 'Voir la FAQ'
      },
      // Account
      account: {
        updateInfo: 'Mettez à jour vos informations personnelles et préférences.',
        passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
        userNotLoaded: 'Utilisateur non chargé',
        noToken: 'Aucun jeton trouvé — veuillez vous reconnecter',
        profileUpdated: 'Profil mis à jour avec succès !',
        loadingProfile: 'Chargement du profil...',
        userName: 'Nom d\'utilisateur',
        userEmail: 'utilisateur@exemple.com',
        fullName: 'Nom complet',
        email: 'Email',
        phone: 'Téléphone',
        role: 'Rôle',
        leaveBlank: 'Laissez vide pour conserver l\'actuel',
        changePassword: 'Changer le mot de passe',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le mot de passe'
      },
      // Common
      common: {
        client: 'client'
      },
      // Client Dashboard
      client: {
        dashboard: 'Tableau de bord Client',
        totalTickets: 'Nombre total de tickets',
        open: 'Ouvert',
        pending: 'En attente',
        resolvedClosed: 'Résolu/Fermé',
        recentTickets: 'Tickets récents',
        viewAll: 'Voir tout',
        quickActions: 'Actions rapides',
        createTicket: 'Créer un nouveau ticket',
        noRecentTickets: 'Aucun ticket récent',
        checkTickets: 'Consultez votre page « tickets » pour toute l\'activité'
      },
      // Agent dashboard translations
      agent: {
        totalResolved: 'Total resolved',
        resolvedToday: 'Resolved today',
        openTickets: 'Open tickets',
        availableTickets: 'Available tickets',
        availableTicketsBtn: 'Available Tickets',
        myTicketsBtn: 'My Tickets',
        newTicketBtn: 'New Ticket',
        priorityTickets: 'Priority Tickets',
        urgent: 'urgent',
        noUrgentTickets: 'No urgent tickets at the moment',
        view: 'View'
      }
    }
  }
}

interface I18nProviderProps {
  children: React.ReactNode
}

export default function I18nProvider({ children }: I18nProviderProps) {
  const [i18nInitialized, setI18nInitialized] = useState(false)
  const [lang, setLang] = useState(() => i18n.language || 'en')

  useEffect(() => {
    let mounted = true

    const onLanguageChanged = (lng: string) => {
      try {
        document.documentElement.lang = lng || 'en'
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
          fallbackLng: 'en',
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
          const current = i18n.language || 'en'
          setLang(current)
          try {
            document.documentElement.lang = current || 'en'
          } catch (e) {
            // ignore
          }
        })
    } else {
      setI18nInitialized(true)
      const current = i18n.language || 'en'
      setLang(current)
      try {
        document.documentElement.lang = current || 'en'
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
