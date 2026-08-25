/** Icon sprite from the approved mockups. Rendered once per page in the layout. */
export function SvgSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <symbol id="s-managed" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#0E336A" strokeWidth="2.4"/><path d="M24 13v4M24 31v4M13 24h4M31 24h4" stroke="#0E336A" strokeWidth="2.4" strokeLinecap="round"/><circle cx="24" cy="24" r="6" fill="#0E336A"/></symbol>
        <symbol id="s-emergency" viewBox="0 0 48 48"><path d="M24 5 L43 39 H5 Z" fill="none" stroke="#FF8B00" strokeWidth="2.6" strokeLinejoin="round"/><path d="M24 19v9" stroke="#FF8B00" strokeWidth="3" strokeLinecap="round"/><circle cx="24" cy="33" r="1.7" fill="#FF8B00"/></symbol>
        <symbol id="s-consult" viewBox="0 0 48 48"><path d="M8 12h32v20H20l-8 8V32H8z" fill="none" stroke="#0E7C4A" strokeWidth="2.4" strokeLinejoin="round"/><circle cx="17" cy="22" r="1.8" fill="#0E7C4A"/><circle cx="24" cy="22" r="1.8" fill="#0E7C4A"/><circle cx="31" cy="22" r="1.8" fill="#0E7C4A"/></symbol>
        <symbol id="s-ha" viewBox="0 0 48 48"><rect x="9" y="8" width="30" height="8" rx="2" fill="none" stroke="#1E529D" strokeWidth="2.4"/><rect x="9" y="20" width="30" height="8" rx="2" fill="none" stroke="#1E529D" strokeWidth="2.4"/><rect x="9" y="32" width="30" height="8" rx="2" fill="none" stroke="#1E529D" strokeWidth="2.4"/><circle cx="16" cy="12" r="1.7" fill="#349C55"/><circle cx="16" cy="24" r="1.7" fill="#349C55"/><circle cx="16" cy="36" r="1.7" fill="#349C55"/></symbol>
        <symbol id="s-etl" viewBox="0 0 48 48"><circle cx="10" cy="24" r="5" fill="none" stroke="#FFB318" strokeWidth="2.4"/><rect x="30" y="10" width="12" height="12" rx="2" fill="none" stroke="#FFB318" strokeWidth="2.4"/><rect x="30" y="26" width="12" height="12" rx="2" fill="none" stroke="#FFB318" strokeWidth="2.4"/><path d="M15 24h10M25 24l6-8M25 24l6 8" fill="none" stroke="#FFB318" strokeWidth="2.2" strokeLinecap="round"/></symbol>
        <symbol id="s-cloud" viewBox="0 0 48 48"><path d="M14 34a8 8 0 0 1 1-16 10 10 0 0 1 19-3 7 7 0 0 1 1 19Z" fill="none" stroke="#D87600" strokeWidth="2.4" strokeLinejoin="round"/></symbol>
        <symbol id="s-code" viewBox="0 0 48 48"><path d="M17 14 7 24l10 10M31 14l10 10-10 10M27 12l-6 24" stroke="#0E7C4A" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="s-shield" viewBox="0 0 48 48"><path d="M24 5 41 11v11c0 13-8.5 19-17 21C15.5 41 7 35 7 22V11Z" fill="none" stroke="#FF8B00" strokeWidth="2.4" strokeLinejoin="round"/><path d="M17 24l5 5 10-11" fill="none" stroke="#FF8B00" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="s-check" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#E7F5EC"/><path d="M7 12.5l3 3 7-7" stroke="#0E7C4A" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm1.4 2 7.6 5.7L19.6 7H4.4zM4 8.4V17h16V8.4l-8 6-8-6z"/></symbol>
        <symbol id="i-phone" viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.8c1.3 2.6 3.4 4.7 6 6l2-2c.3-.3.7-.4 1-.2 1 .4 2.2.6 3.4.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.8c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.4.1.4 0 .8-.2 1l-2 2z"/></symbol>
        <symbol id="i-calendar" viewBox="0 0 24 24"><path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zM5 9h14v10H5V9z"/></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 7v5l4 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></symbol>
      </defs>
    </svg>
  );
}
