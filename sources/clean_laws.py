import re
import sys

# For drop caps on the letters "A" and "I" (the only single-letter English
# words), the letter is sometimes itself a standalone word ("A player") and
# sometimes the start of a longer word ("A" + "ccidents" -> "Accidents").
# Enumerated exhaustively from both source documents - see conversation.
KEEP_SPACE_FRAGMENTS = {
    'captain', 'corner', 'direct', 'goal', 'goalkeeper', 'kick', 'match',
    'named', 'penalty', 'player', 'predefined', 'reserve', 'temporarily',
    'throw', 'video',
}

# Same ambiguity, but for bullet-list items where pdftotext splits the first
# (lowercase) letter of the line from the rest - only "a" is ambiguous here,
# since it's the only single-letter lowercase English word. Enumerated
# exhaustively from both source documents.
KEEP_SPACE_BULLET_FRAGMENTS = {
    'corner', 'direct', 'goal', 'goalkeeper', 'handball', 'pattern',
    'penalty', 'player', 'severe', 'shirt', 'single', 'spectator',
    'substitute', 'substitution', 'team', 'throw', 'wrongly',
}


def clean(text: str) -> str:
    # Drop-cap artifacts: control char (BEL) marks a decorative drop-cap glyph
    # that pdftotext extracts as "<CAP>\x07 <rest>". For any letter other than
    # A/I, no English word starts and ends there, so it's always a join:
    # "F\x07 ootball" -> "Football".
    def _join_dropcap(m: re.Match) -> str:
        letter, fragment = m.group(1), m.group(2)
        if letter in ('A', 'I') and fragment in KEEP_SPACE_FRAGMENTS:
            return f'{letter} {fragment}'
        return f'{letter}{fragment}'

    text = re.sub(r'([A-Z])\x07 ([a-z]+)', _join_dropcap, text)
    # Any remaining bare occurrences (e.g. "\x07Poor" -> "Poor")
    text = text.replace('\x07', '')

    # Bullet-list first-letter split: "• t ouches" -> "• touches".
    # Only "a" is ambiguous (the lone lowercase single-letter English word).
    def _join_bullet(m: re.Match) -> str:
        bullet, letter, fragment = m.group(1), m.group(2), m.group(3)
        if letter == 'a' and fragment in KEEP_SPACE_BULLET_FRAGMENTS:
            return f'{bullet}{letter} {fragment}'
        return f'{bullet}{letter}{fragment}'

    text = re.sub(r'(• )([a-z]) ([a-z]+)', _join_bullet, text)

    # Form-feed page-break markers inserted by pdftotext
    text = text.replace('\x0c', '\n')

    # Strip repeated running headers like "Laws of the Game 2026/27 | Offside"
    text = re.sub(r'^Laws of the Game \d{4}/\d{2} \|.*$', '', text, flags=re.MULTILINE)

    # Strip standalone page-number lines
    text = re.sub(r'^\s*\d{1,4}\s*$', '', text, flags=re.MULTILINE)

    # Collapse 3+ blank lines down to 2
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip() + '\n'


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, encoding='utf-8') as f:
        data = f.read()
    cleaned = clean(data)
    with open(dst, 'w', encoding='utf-8') as f:
        f.write(cleaned)
    print(f'{src}: {len(data)} -> {len(cleaned)} chars')
