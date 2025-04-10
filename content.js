// Improved Bible verse regular expression to handle various scenarios

//const verseRegex =  /(?:^|\s|\()([1-3]?\s*[A-Za-zА-Яа-яіїєІЇЄ]+(?:\s+[A-Za-zА-Яа-яіїєІЇЄ]+)*\s+\d{1,3}[.:](\d{1,3}(?:-\d{1,3})?(?:,\d{1,3})*))(?=\s|\)|$|[.,;?!])/g;
const verseRegex =
  /(?:^|\s|\()([1-3]?\s*[A-Za-zА-Яа-яіїєІЇЄ]+\.?(?:\s+[A-Za-zА-Яа-яіїєІЇЄ]+)*\s+\d{1,3}[.:](\d{1,3}(?:-\d{1,3})?(?:,\d{1,3})*))(?=\s|\)|$|[.,;?!])/g;

let bibleData = null;
let fuse = null;
// Fetch verses.json initially and prepare Fuse.js for fuzzy searching
async function loadBibleData() {
  const response = await fetch(chrome.runtime.getURL("verses.json"));
  bibleData = await response.json();

  // Prepare the Fuse.js options
  const options = {
    includeScore: true,
    keys: ["name"],
  };

  // Flatten books for Fuse.js
  const booksForSearch = bibleData.books.map((book) => ({
    name: book.name,
    chapters: book.chapters,
  }));

  // Initialize Fuse with the books data
  fuse = new Fuse(booksForSearch, options);

  // Enhance any existing links and wrap non-link Bible verses
  enhanceBibleVerseLinks(document.body);
  wrapBibleVerses(document.body);
}

// Fuzzy search function for books
function fuzzySearchBooks(bookName) {
  // console.log("Searching for book:", bookName);
  if (!fuse) return null;
  const result = fuse.search(bookName);
  return result.length ? result[0].item : null;
}

function correctBookName(booknameforcorrection) {
  // Dictionary mapping book name abbreviations and numbers to full names
  const bookNameMappings = {
    См: "Самуїлова",
    Цр: "Царів",
    Хр: "Хроніки",
    Ів: "Івана",
    Пт: "Петра",
    Пет: "Петра",
    Кор: "до Коринтян",
    Кр: "до Коринтян",
    Сол: "до Солунян",
    Сл: "до Солунян",
    Тим: "Тимофію",
    Тм: "Тимофію",
  };

  // Regular expression to capture book number and abbreviation
  const regex = /^(\d*)\s*([А-Яа-я]+)\.?$/;

  if (booknameforcorrection === "Ів" || booknameforcorrection === "Ів.")
    booknameforcorrection = "Від Івана";
  if (booknameforcorrection === "Мт" || booknameforcorrection === "Мт.")
    booknameforcorrection = "Від Матвія";
  if (booknameforcorrection === "Лк" || booknameforcorrection === "Лк.")
    booknameforcorrection = "Від Луки";
  if (booknameforcorrection === "Мр" || booknameforcorrection === "Мр.")
    booknameforcorrection = "Від Марка";
  if (booknameforcorrection === "Євр" || booknameforcorrection === "Євр.")
    booknameforcorrection = "До Євреїв";

  const matches = booknameforcorrection.match(regex);

  if (matches) {
    const [_, number, abbreviation] = matches;
    const roman = ["I", "II", "III"][parseInt(number) - 1]; // Convert numbers 1, 2, 3 to Roman numerals

    if (abbreviation in bookNameMappings) {
      return `${roman} ${bookNameMappings[abbreviation]}`;
    }
  }

  // Return original name if no pattern matches or abbreviation not in dictionary
  return booknameforcorrection;
}

// Function to find verse text
function getVerseText(reference) {
  let match = reference.match(
    /^([1-3]?\s*[A-Za-zА-Яа-яіїєІЇЄ]+\s*[A-Za-zА-Яа-яіїєІЇЄ]*)(\s+\d+[:]\d+([,-]\d+)*)/,
  );
  if (!match) return null;

  let bookName = correctBookName(match[1].trim());
  let chapterAndVerses = match[2].trim();
  const chapterVerseSplit = chapterAndVerses.split(":");
  const chapterNumber = parseInt(chapterVerseSplit[0]);
  const verseNumbers = chapterVerseSplit[1];
  console.log("Book Name:", bookName);
  console.log("Chapter Number:", chapterNumber);
  console.log("Verse Numbers:", verseNumbers);
  const book = fuzzySearchBooks(bookName);
  if (!book) return null;

  const chapter = book.chapters.find((c) => c.chapter === chapterNumber);
  if (!chapter) return null;

  // Initialize verseTexts array to collect texts of all verses
  let verseTexts = [];

  // Check if there is a range or list of verses
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

// Enhance links that contain Bible verses
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

// Wrap non-link Bible verses in spans
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

// Tooltip element for displaying verse text
const tooltip = document.createElement("div");
tooltip.id = "bible-tooltip";
document.body.appendChild(tooltip);

// Tooltip mouseover event for interactive display
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

// Tooltip mouseout event to hide tooltip
document.addEventListener("mouseout", (e) => {
  if (e.target.closest(".bible-verse-tooltip")) {
    tooltip.style.opacity = "0";
  }
});

// Load the bible data and apply functions once the document is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadBibleData);
} else {
  loadBibleData();
}
