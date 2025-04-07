// Simple Bible verse database (expandable)
const BIBLE_VERSES = {
  "John 3:16":
    "For God so loved the world, that he gave his only begotten Son, that whoever believes in him should not perish, but have everlasting life.",
  "Philippians 4:13": "I can do all things through Christ who strengthens me.",
  "Proverbs 3:5":
    "Trust in the LORD with all your heart and lean not on your own understanding.",
  "Jeremiah 29:11":
    "For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope.",
  "Psalm 23:1": "The LORD is my shepherd; I shall not want.",
  "Joshua 1:9":
    "Be strong and courageous. Do not be frightened, and do not be dismayed, for the LORD your God is with you wherever you go.",
};

// Function to retrieve verse text
function getVerseText(reference) {
  return BIBLE_VERSES[reference] || null;
}
