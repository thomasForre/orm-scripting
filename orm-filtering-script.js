// Apply prefered filtering TODAY
const COMPLEX = "ELDFISK COMPLEX";
const btnSearch = document.querySelector('[data-testid="search-button"]');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async function main() {
  const btnClearSearch =  document.querySelector('[data-testid="clear-search-button"]');
  btnClearSearch?.click();
    
  if (!openCalendar()) return;

  if (!await selectToday()) return;
  
  closeCalendar();
  
  selectComplex();
  
  search();

  return 0;
})();

function openCalendar() {
  const btnCalendar = document.querySelector('[data-testid="open-range-calendar-button"]');
  if (!btnCalendar) {
    console.log("Calendar button not found");
    return false;
  }
  btnCalendar.click();
  console.log("Open calendar");
  return true;
}

function closeCalendar() {
  const calendar = document.querySelector('[data-testid="range-calendar-popover"]');
  const calendarOverlay = calendar?.firstElementChild;

  btnSearch?.focus();
  calendarOverlay?.click();
}

async function selectToday() {
  const start = Date.now();
  const timeout = 5000;
  let btnToday;
  
  // Wait for Today-button
  while (true) {
    let btnList = document.querySelector('ul[aria-label="Choose Date Range"]');
    btnToday = btnList?.querySelector('li:nth-child(2) button');

    if (btnToday) break;
    
    if (Date.now() - start > timeout) {
      console.log("Timeout reached, element not found");
      return false;
    }
    await wait(10);
  }
  
  // Select Today
  btnToday.click();
  
  return true;
}

async function selectComplex() {
  const ddComplex = document.querySelector('[data-testid="site-search-field"] div');
  const start = Date.now();
  const timeout = 5000;

  let presentation;
  
  if (!ddComplex) return false;

  // "Click" on dropdown to open
  ddComplex.dispatchEvent(new MouseEvent('mousedown', {
    bubbles: true
  }));

  // Wait for element to load
  while (true) {
    presentation = document.getElementById("menu-");

    if (presentation) break;
    
    if (Date.now() - start > timeout) {
      console.log("Timeout reached, element not found");
      return false;
    }
    await wait(10);
  }
  
  const overlay = presentation.firstElementChild;
  const checkbox = presentation.querySelector(`ul li[data-value="${COMPLEX}"] div span input`);
  
  if (!checkbox.checked) {
    checkbox.dispatchEvent(new MouseEvent('click', {
      bubbles: true
    }));
  }
  
  btnSearch.focus();
  overlay.click();
}

function search() {
  btnSearch.click();
}