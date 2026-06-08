import { useEffect, useState } from 'react';

const applicant = (a) => [a.first_name, a.last_name].filter(Boolean).join(' ') || a.email || a.id.slice(0, 8);
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

// Gallery of past biennales: one card per archived edition (year + winner +
// counts). Clicking a card opens that edition's full retrospective.
export default function EditionGallery({ currentEdition, editionYears, onPick }) {
  const [byEdition, setByEdition] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (currentEdition <= 1) { setReady(true); return; }
    let cancelled = false;
    // Lazy import to avoid a hard dependency cycle.
    import('../lib/supabase.js').then(async ({ supabase }) => {
      if (!supabase) return;
      const { data } = await supabase
        .from('applications')
        .select('id, first_name, last_name, email, edition, standing, payment_status')
        .lt('edition', currentEdition).eq('payment_status', 'paid');
      if (cancelled) return;
      const groups = {};
      (data || []).forEach((a) => {
        (groups[a.edition] ||= { total: 0, winners: [] }).total += 1;
        if (a.standing === 'winner') groups[a.edition].winners.push(a);
      });
      setByEdition(groups);
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [currentEdition]);

  const editions = Array.from({ length: currentEdition - 1 }, (_, i) => currentEdition - 1 - i);

  if (!ready) return <p className="cycle-note" style={{ marginTop: 20 }}>…</p>;
  if (editions.length === 0) return <p className="cycle-note" style={{ marginTop: 20 }}>Архив пуст — это первый цикл.</p>;

  return (
    <div className="edition-gallery">
      {editions.map((ed) => {
        const g = byEdition[ed] || { total: 0, winners: [] };
        const top = g.winners[0];
        return (
          <button key={ed} type="button" className="edition-card" onClick={() => onPick(ed)}>
            <span className="edition-card__year">Биеннале {editionYears[ed] || `№${ed}`}</span>
            {top ? (
              <span className="edition-card__winner">🥇 {applicant(top)}</span>
            ) : (
              <span className="edition-card__winner edition-card__winner--none">Победитель не выбран</span>
            )}
            <span className="edition-card__stats">
              {g.total} {plural(g.total, 'заявка', 'заявки', 'заявок')}
              {g.winners.length > 0 && ` · ${g.winners.length} ${plural(g.winners.length, 'победитель', 'победителя', 'победителей')}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
