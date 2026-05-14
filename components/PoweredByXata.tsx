/**
 * Attribution badge for Xata. Per https://xata.io/brand the mark must not be
 * edited, recolored, or distorted — keep the SVG and its #8468F6 fill as-is.
 */
export function PoweredByXata() {
  return (
    <footer className="mt-auto border-t border-black/5 px-6 py-4 text-xs text-zinc-500 dark:border-white/5">
      <a
        href="https://xata.io"
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex w-fit items-center gap-2 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        <span>Powered by</span>
        <svg
          viewBox="0 0 134 135"
          aria-label="Xata"
          className="h-3.5 w-3.5"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M123.722 75.9603C134.414 94.605 131.855 118.755 116.031 134.759L115.793 135L90.1598 109.432L123.722 75.9603ZM61.5092 82.2214C59.4071 89.7816 55.4634 96.9367 49.6692 102.98L48.8688 103.777L14.4128 69.3976C-4.71929 50.3144 -4.80496 19.423 14.1622 0.237778L14.4026 0L49.8093 35.3124C62.0775 48.2125 65.9769 66.1307 61.5092 82.2214ZM10.2767 75.9603C-0.417366 94.605 2.14997 118.755 17.9704 134.759L18.2117 135L43.8437 109.432L10.2767 75.9603ZM72.4934 82.2214C74.5891 89.7816 78.541 96.9367 84.3343 102.98L85.1349 103.777L119.586 69.3976C138.722 50.3144 138.803 19.423 119.837 0.237778L119.598 0L84.1897 35.3124C71.926 48.2125 68.021 66.1307 72.4934 82.2214Z"
            fill="#8468F6"
          />
        </svg>
        <span className="font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
          Xata
        </span>
      </a>
    </footer>
  );
}
