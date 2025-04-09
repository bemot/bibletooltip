const verseRegex =
  /(?:^|\s|\()([1-3]?\s*[A-Za-zА-Яа-яіїєІЇЄ]+\.?(?:\s+[A-Za-zА-Яа-яіїєІЇЄ]+)*\s+\d{1,3}[.:](\d{1,3}(?:-\d{1,3})?(?:,\d{1,3})*))(?=\s|\)|$|[.,;?!])/g;

let bibleData = null;
let fuse = null;

async function loadBibleData() {
  const response = await fetch(chrome.runtime.getURL("verses.json"));
  bibleData = await response.json();
  const options = {
    includeScore: true,
    keys: ["name"],
  };
  const booksForSearch = bibleData.books.map((book) => ({
    name: book.name,
    chapters: book.chapters,
  }));
  fuse = new Fuse(booksForSearch, options);
  enhanceBibleVerseLinks(document.body);
  wrapBibleVerses(document.body);
}

function fuzzySearchBooks(bookName) {
  if (!fuse) return null;
  const result = fuse.search(bookName);
  return result.length ? result[0].item : null;
}

function getVerseText(reference) {
  let match = reference.match(
    /^([1-3]?\s*[A-Za-zА-Яа-яіїєІЇЄ]+\s*[A-Za-zА-Яа-яіїєІЇЄ]*)(\s+\d+[:]\d+([,-]\d+)*)/,
  );
  if (!match) return null;
  let bookName = match[1].trim();
  let chapterAndVerses = match[2].trim();
  const chapterVerseSplit = chapterAndVerses.split(":");
  const chapterNumber = parseInt(chapterVerseSplit[0]);
  const verseNumbers = chapterVerseSplit[1];
  const book = fuzzySearchBooks(bookName);
  if (!book) return null;
  const chapter = book.chapters.find((c) => c.chapter === chapterNumber);
  if (!chapter) return null;
  let verseTexts = [];
  if (verseNumbers.includes("-")) {
    const [start, end] = verseNumbers.split("-").map(Number);
    for (let v = start; v <= end; v++) {
      const verse = chapter.verses.find((verse) => verse.verse === v);
      if (verse) verseTexts.push(`${v}: ${verse.text}`);
    }
  } else if (verseNumbers.includes(",")) {
    const verses = verseNumbers.split(",").map(Number);
    verses.forEach((v) => {
      const verse = chapter.verses.find((verse) => verse.verse === v);
      if (verse) verseTexts.push(`${v}: ${verse.text}`);
    });
  } else {
    const verseNumber = parseInt(verseNumbers);
    const verse = chapter.verses.find((verse) => verse.verse === verseNumber);
    if (verse) verseTexts.push(`${verseNumber}: ${verse.text}`);
  }
  return verseTexts.join("; ");
}

function enhanceBibleVerseLinks(node) {
  const links = node.querySelectorAll("a");
  links.forEach((link) => {
    if (link.textContent.match(verseRegex)) {
      link.classList.add("bible-verse-tooltip");
      link.setAttribute(
        "data-reference",
        link.textContent.trim().replace(/[().]/g, ""),
      );
    }
  });
}

function wrapBibleVerses(node) {
  let textNodes = [];
  let walker = document.createTreeWalker(
    node,
    NodeFilter.SHOW_TEXT,
    null,
    false,
  );
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }
  textNodes.forEach((node) => {
    let matches = [...node.textContent.matchAll(verseRegex)];
    if (matches.length > 0) {
      const spanFragment = document.createDocumentFragment();
      let lastIdx = 0;
      matches.forEach((match) => {
        spanFragment.appendChild(
          document.createTextNode(node.textContent.slice(lastIdx, match.index)),
        );
        lastIdx = match.index + match[0].length;
        const verseSpan = document.createElement("span");
        verseSpan.className = "bible-verse-tooltip";
        verseSpan.setAttribute(
          "data-reference",
          match[0].trim().replace(/[().]/g, ""),
        );
        verseSpan.textContent = match[0].trim();
        spanFragment.appendChild(verseSpan);
      });
      spanFragment.appendChild(
        document.createTextNode(node.textContent.slice(lastIdx)),
      );
      node.parentNode.replaceChild(spanFragment, node);
    }
  });
}
const tooltip = document.createElement("div");
tooltip.id = "bible-tooltip";
tooltip.style.position = "absolute";
tooltip.style.pointerEvents = "auto"; // Ensure the tooltip can receive click events
tooltip.style.opacity = "0";
tooltip.style.transition = "opacity 0.2s"; // Smooth transition for tooltip appearance
document.body.appendChild(tooltip);

// Function to hide tooltip
function hideTooltip() {
  tooltip.style.opacity = "0";
}

// Enhance visibility and interaction with the tooltip
tooltip.addEventListener("click", function() {
  navigator.clipboard
    .writeText(tooltip.textContent.replace(/^[^–]*– "/, "").slice(0, -1)) // Removes reference and quotes
    .then(() => {
      console.log("Verse copied to clipboard");
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
});

tooltip.addEventListener("mouseover", function() {
  clearTimeout(tooltip.hideTimeout);
});

tooltip.addEventListener("mouseout", function() {
  tooltip.hideTimeout = setTimeout(hideTooltip, 500); // Delay hiding tooltip
});

document.addEventListener("mouseover", (e) => {
  const target = e.target.closest(".bible-verse-tooltip");
  if (target) {
    clearTimeout(tooltip.hideTimeout); // Cancel any pending hide operation
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

document.addEventListener("mouseout", (e) => {
  if (
    e.target.closest(".bible-verse-tooltip") &&
    !e.relatedTarget.closest("#bible-tooltip")
  ) {
    tooltip.hideTimeout = setTimeout(hideTooltip, 500); // Delay hiding tooltip
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBibleData);
} else {
  loadBibleData();
}
