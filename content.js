// Improved Bible verse regular expression without lookbehind
const verseRegex =
  /(?:^|[\s(.,;"'“‘])([1-3]?\s?[A-Za-z]+)\s(\d{1,3}:\d{1,3})\b/g;

// Wrap Bible verses with spans
function wrapBibleVerses(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent;
    let match,
      lastIndex = 0;
    const fragment = document.createDocumentFragment();

    verseRegex.lastIndex = 0; // reset regex for each node
    while ((match = verseRegex.exec(text)) !== null) {
      const [fullMatch, book, chapterVerse] = match;
      const ref = `${book} ${chapterVerse}`;

      // Adjust to skip the leading character if matched
      const matchStart = match.index + fullMatch.indexOf(book);

      fragment.append(
        document.createTextNode(text.substring(lastIndex, matchStart)),
      );

      const span = document.createElement("span");
      span.className = "bible-verse-tooltip";
      span.setAttribute("data-reference", ref);
      span.textContent = ref;

      fragment.append(span);
      lastIndex = matchStart + ref.length;
    }

    fragment.append(document.createTextNode(text.substring(lastIndex)));
    if (fragment.childNodes.length) {
      node.replaceWith(fragment);
    }
  } else if (
    node.nodeType === Node.ELEMENT_NODE &&
    !["SCRIPT", "STYLE", "A"].includes(node.tagName)
  ) {
    node.childNodes.forEach(wrapBibleVerses);
  }
}

// Run initially
wrapBibleVerses(document.body);

// Tooltip element
const tooltip = document.createElement("div");
tooltip.id = "bible-tooltip";
document.body.appendChild(tooltip);

// Tooltip mouseover event
document.addEventListener("mouseover", (e) => {
  const target = e.target.closest(".bible-verse-tooltip");
  if (target) {
    const ref = target.getAttribute("data-reference");
    const verse = getVerseText(ref);
    if (verse) {
      tooltip.textContent = `${ref} – "${verse}"`;
      tooltip.style.top = `${e.pageY + 10}px`;
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.opacity = "1";
    }
  }
});

// Tooltip mouseout event
document.addEventListener("mouseout", (e) => {
  if (e.target.closest(".bible-verse-tooltip")) {
    tooltip.style.opacity = "0";
  }
});
