'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Language {
  code: string
  name: string
  flag: string
}

const languages: Language[] = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' }
]

interface LanguageSelectorProps {
  className?: string
  variant?: 'default' | 'minimal' | 'icon-only'
}

export default function LanguageSelector({ 
  className, 
  variant = 'default' 
}: LanguageSelectorProps) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode)
    setIsOpen(false)
  }

  if (variant === 'icon-only') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors",
            className
          )}
          aria-label="Change language"
        >
          <Globe className="w-5 h-5" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={cn(
                    "w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors",
                    currentLanguage.code === language.code && "bg-blue-50 text-blue-600"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-sm font-medium">{language.name}</span>
                  </div>
                  {currentLanguage.code === language.code && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (variant === 'minimal') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors",
            className
          )}
        >
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="font-medium">{currentLanguage.code.toUpperCase()}</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                  className={cn(
                    "w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors",
                    currentLanguage.code === language.code && "bg-blue-50 text-blue-600"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-sm font-medium">{language.name}</span>
                  </div>
                  {currentLanguage.code === language.code && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors shadow-sm",
          className
        )}
      >
        <Globe className="w-5 h-5 text-gray-500" />
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentLanguage.flag}</span>
          <span className="text-sm font-medium text-gray-700">{currentLanguage.name}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors",
                  currentLanguage.code === language.code && "bg-blue-50 text-blue-600"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{language.flag}</span>
                  <span className="font-medium">{language.name}</span>
                </div>
                {currentLanguage.code === language.code && (
                  <Check className="w-5 h-5" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
