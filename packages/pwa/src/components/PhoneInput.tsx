import { useState } from 'react';

interface Country {
  code: string;
  prefix: string;
  flag: string;
  name: string;
  maxDigits: number;
}

const COUNTRIES: Country[] = [
  { code: 'CO', prefix: '57', flag: '🇨🇴', name: 'Colombia', maxDigits: 10 },
  { code: 'VE', prefix: '58', flag: '🇻🇪', name: 'Venezuela', maxDigits: 10 },
  { code: 'MX', prefix: '52', flag: '🇲🇽', name: 'México', maxDigits: 10 },
  { code: 'AR', prefix: '54', flag: '🇦🇷', name: 'Argentina', maxDigits: 10 },
  { code: 'PE', prefix: '51', flag: '🇵🇪', name: 'Perú', maxDigits: 9 },
  { code: 'EC', prefix: '593', flag: '🇪🇨', name: 'Ecuador', maxDigits: 9 },
  { code: 'US', prefix: '1', flag: '🇺🇸', name: 'EE.UU.', maxDigits: 10 },
  { code: 'ES', prefix: '34', flag: '🇪🇸', name: 'España', maxDigits: 9 },
  { code: 'NL', prefix: '31', flag: '🇳🇱', name: 'Países Bajos', maxDigits: 9 },
];

interface Props {
  value: string;
  onChange: (fullPhone: string) => void;
  error?: string;
}

export function getPhoneError(phone: string): string | null {
  if (!phone) return 'El número de teléfono es obligatorio';
  if (/\D/.test(phone)) return 'El teléfono solo puede contener números';
  if (phone.length < 7) return 'El número es demasiado corto';
  return null;
}

export function splitPhone(fullPhone: string): { prefix: string; number: string } {
  for (const country of COUNTRIES) {
    if (fullPhone.startsWith(country.prefix)) {
      return { prefix: country.prefix, number: fullPhone.slice(country.prefix.length) };
    }
  }
  return { prefix: '57', number: fullPhone };
}

export default function PhoneInput({ value, onChange, error }: Props) {
  const { prefix: initialPrefix, number: initialNumber } = splitPhone(value);
  const [prefix, setPrefix] = useState(initialPrefix);
  const [number, setNumber] = useState(initialNumber);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const selectedCountry = COUNTRIES.find((c) => c.prefix === prefix) || COUNTRIES[0];

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setNumber(raw);
    onChange(`${prefix}${raw}`);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setPrefix(newPrefix);
    setDropdownOpen(false);
    onChange(`${newPrefix}${number}`);
  };

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="h-full flex items-center gap-1 border border-gray-300 rounded-xl px-3 py-3 text-sm bg-white hover:bg-gray-50 min-w-[100px]"
          >
            <span>{selectedCountry.flag}</span>
            <span className="font-medium text-gray-700">+{prefix}</span>
            <svg className={`w-3 h-3 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute z-10 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handlePrefixChange(country.prefix)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    prefix === country.prefix ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span>{country.name}</span>
                  <span className="text-gray-400 ml-auto">+{country.prefix}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={handleNumberChange}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder="3135230983"
          maxLength={selectedCountry.maxDigits}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1.5 ml-1">Solo números, sin espacios ni guiones</p>
      {error && <p className="text-red-500 text-xs mt-1.5 ml-1">{error}</p>}
    </div>
  );
}
