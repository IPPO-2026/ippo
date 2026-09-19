export function IppoMark({ className = '', decorative = true, label = '' }: { className?: string; decorative?: boolean; label?: string }) {
  return <svg className={className} width="52" height="58" viewBox="0 0 80 90" fill="none" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label}>
    <path d="M39 19C36 8 43 4 54 5C55 16 48 21 39 19Z" fill="#71856A"/>
    <path d="M39 20C28 14 13 21 11 38C8 56 22 66 40 65C59 66 71 54 67 37C64 21 51 15 39 20Z" fill="#E9C493"/>
    <path d="M19 50C15 57 9 58 6 54M63 48C68 54 74 52 75 46" stroke="#BE7453" strokeWidth="4.5" strokeLinecap="round"/>
    <path d="M30 64L26 78L16 80M49 64L54 75L64 76" stroke="#BE7453" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="29" cy="39" r="2.3" fill="#46463C"/><circle cx="50" cy="39" r="2.3" fill="#46463C"/>
    <path d="M36 47C38 50 42 50 45 46" stroke="#46463C" strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="23" cy="45" rx="4" ry="2.5" fill="#D58B6A" fillOpacity=".5"/><ellipse cx="57" cy="45" rx="4" ry="2.5" fill="#D58B6A" fillOpacity=".5"/>
  </svg>;
}

export function StepScene() {
  return <svg className="step-scene" viewBox="0 0 280 160" fill="none" aria-hidden="true">
    <circle cx="202" cy="43" r="22" fill="#EDC17D" fillOpacity=".65"/>
    <path d="M0 115C49 77 89 119 139 97C189 74 216 78 280 95V160H0V115Z" fill="#D9DFC8"/>
    <path d="M0 136C72 124 77 96 147 122C217 149 243 113 280 129V160H0V136Z" fill="#BCCBB0"/>
    <path d="M79 160C72 142 121 134 149 136C177 138 184 126 174 118C163 109 161 102 179 96" stroke="#F7F3E7" strokeWidth="16" strokeLinecap="round"/>
    <path d="M218 92V71M219 79C227 74 232 78 226 84L219 85M217 76C209 76 206 69 211 68C215 66 218 71 218 76" stroke="#7E9470" strokeWidth="3" strokeLinecap="round"/>
    <path d="M35 113L31 95M34 105L40 98" stroke="#7E9470" strokeWidth="3" strokeLinecap="round"/>
    <g transform="translate(91 56) scale(.66)"><path d="M39 19C36 8 43 4 54 5C55 16 48 21 39 19Z" fill="#71856A"/><path d="M39 20C28 14 13 21 11 38C8 56 22 66 40 65C59 66 71 54 67 37C64 21 51 15 39 20Z" fill="#E9C493"/><path d="M30 64L26 78L16 80M49 64L54 75L64 76" stroke="#AA684B" strokeWidth="5" strokeLinecap="round"/><circle cx="29" cy="39" r="2.3" fill="#46463C"/><circle cx="50" cy="39" r="2.3" fill="#46463C"/><path d="M36 47C38 50 42 50 45 46" stroke="#46463C" strokeWidth="2" strokeLinecap="round"/><path d="M20 49L9 56M63 47L73 43" stroke="#AA684B" strokeWidth="4" strokeLinecap="round"/></g>
    <path d="M54 58C58 53 63 53 67 57M78 46C81 42 84 42 88 46" stroke="#B1B99F" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}
