const FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

function format(value: string): string {
  return new Intl.DateTimeFormat('en-AU', { ...FORMAT, timeZone: 'Australia/Melbourne' }).format(
    new Date(value),
  );
}

/**
 * Visible publication and review dates.
 *
 * Retrieval systems down-weight content of unknown age and prefer recent
 * sources for cost, pricing and "best of" queries — and increasingly detect
 * date-stamping applied to unchanged content. These render the page's real
 * timestamps and are mirrored into datePublished / dateModified, so the two can
 * never drift apart: the only way to move the visible date is to edit the page.
 */
export function PageDates({
  published,
  modified,
}: {
  published?: string | null;
  modified?: string | null;
}) {
  if (!published && !modified) return null;

  // Only worth showing both when they are genuinely different days.
  const showBoth =
    published && modified && format(published) !== format(modified);

  return (
    <div className="page-dates">
      <div className="wrap">
        <p>
          {published && (
            <>
              Published <time dateTime={published}>{format(published)}</time>
            </>
          )}
          {showBoth && <span aria-hidden="true"> · </span>}
          {(showBoth || (!published && modified)) && modified && (
            <>
              Last reviewed <time dateTime={modified}>{format(modified)}</time>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
