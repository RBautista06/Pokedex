import { displayRadarChart } from "./chart.js";
import {
  heightComparison,
  getpokemonTypes,
  getPokemonEvolutions,
} from "./stats.js";

const pokemonForm = document.querySelector("#form");
const pokemonInput = document.querySelector("#searchInput");
const pokemonImgS = document.querySelector("#pokemonSprite");
const pokemonCry = document.querySelector("#pokemonCry");
const errorContainer = document.querySelector(".error-wrapper");
const errorDisplay = document.querySelector("#error-display");
const pokemonNameTitle = document.querySelector("#pokemon-name");
const spawnElements = document.querySelectorAll(".spawn");
const pokemonSuggestion = document.querySelector("#search-suggestion");
const statsMaxValue = {
  hp: 300,
  attack: 200,
  defense: 250,
  "special-attack": 200,
  "special-defense": 250,
  speed: 220,
};
let allPokemonNames = [];

async function fetchAllPokemonNames() {
  const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=10000");
  const data = await response.json();
  allPokemonNames = data.results.map((pokemon) => pokemon.name);
}
fetchAllPokemonNames();

function formatPokemonName(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

// Convert formatted name back to raw dash-separated lowercase for fetch
function formattedToRaw(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function pokemonName(pokemon) {
  pokemonNameTitle.textContent = formatPokemonName(pokemon);
}

pokemonInput.addEventListener("input", () => {
  const input = pokemonInput.value.toLowerCase();
  const suggestions = allPokemonNames
    .filter((name) => name.startsWith(input))
    .slice(0, 6);

  const suggestionBox = document.querySelector(".search-suggestion");
  if (input.trim() && suggestions.length) {
    suggestionBox.style.display = "block";
  } else {
    suggestionBox.style.display = "none";
  }

  renderSuggestions(suggestions);
});

function renderSuggestions(suggestions) {
  pokemonSuggestion.innerHTML = "";

  suggestions.forEach((name) => {
    const li = document.createElement("li");
    li.textContent = formatPokemonName(name);
    li.addEventListener("click", () => {
      // Show formatted name in input
      pokemonInput.value = formatPokemonName(name);
      pokemonSuggestion.innerHTML = "";
      document.querySelector(".search-suggestion").style.display = "none";
    });
    pokemonSuggestion.appendChild(li);
  });
}

spawnElements.forEach((elements, i) => {
  setTimeout(() => {
    elements.classList.add("pop");
  }, i * 400);
});

pokemonForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  // Convert formatted input to raw format for fetching
  const rawPokemonName = formattedToRaw(pokemonInput.value.trim());

  if (!rawPokemonName) {
    displayError("Please Enter a Pokemon");
    return;
  }

  try {
    const pokemonData = await getPokemonData(rawPokemonName);
    errorContainer.style.display = "none";

    displayData(pokemonData);
    // Show formatted name in the title
    pokemonName(rawPokemonName);
  } catch (error) {
    console.error(error);
    displayError(error.message);
    pokemonNameTitle.textContent = "Invalid Name";
    document.querySelector(".search-suggestion").style.display = "none";
  }
});

export async function getPokemonData(pokemon) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
  if (!response.ok) {
    throw new Error("Please Enter a Valid Pokemon Name");
  }
  const data = await response.json();
  return data;
}
let loaderStartTime = null;

export function showLoader() {
  const loader = document.getElementById("loader");
  loader.classList.add("visible");
  loaderStartTime = Date.now();
}

export function hideLoader() {
  const loader = document.getElementById("loader");
  const elapsed = Date.now() - loaderStartTime;

  const minDuration = 1000;
  const remainingTime = Math.max(minDuration - elapsed, 0);

  setTimeout(() => {
    loader.classList.remove("visible");
  }, remainingTime);
}
export async function displayData(pokemonData) {
  showLoader();

  const minLoaderDuration = 2000;
  const loaderStartTime = Date.now();

  try {
    const pokemonSprite =
      pokemonData.sprites.other["official-artwork"].front_default;
    const pokemonCryURL = pokemonData.cries?.latest || "";

    // 1. Preload image invisibly
    const preloadedImage = new Image();
    const imageLoaded = new Promise((resolve, reject) => {
      preloadedImage.onload = () => resolve();
      preloadedImage.onerror = reject;
      preloadedImage.src = pokemonSprite;
    });

    // 2. Load evolutions (async)
    const evolutionsLoaded = getPokemonEvolutions(pokemonData);

    // 3. Wait for both image and evolutions
    await Promise.all([imageLoaded, evolutionsLoaded]);

    // 4. Ensure loader stays visible at least 3 seconds
    const elapsed = Date.now() - loaderStartTime;
    const remaining = Math.max(minLoaderDuration - elapsed, 0);
    if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

    // 5. Hide loader
    hideLoader();

    // 6. Now swap in the real image and trigger animation
    pokemonImgS.classList.remove("initial-animate");
    pokemonImgS.classList.remove("animate-sprite");
    void pokemonImgS.offsetWidth;
    pokemonImgS.src = pokemonSprite;
    pokemonImgS.classList.add("animate-sprite");

    // 7. Play cry and display everything else
    if (pokemonCryURL) {
      pokemonCry.src = pokemonCryURL;
      pokemonCry.play();
    }

    getPokemonType(pokemonData);
    getPokemonDescription(pokemonData);
    const { pillColor, graphColor } = getPokemonType(pokemonData);
    renderStatBars(pokemonData.stats, pillColor);
    displayRadarChart(pokemonData.stats, graphColor, statsMaxValue);
    heightComparison(pokemonData, pokemonSprite);
    getpokemonTypes(pokemonData);

    document.querySelector(".statistics").style.display = "flex";
    document.querySelector(".evolution-chart-container").style.display = "flex";
  } catch (error) {
    console.error("Error displaying data:", error);
    displayError("Failed to load Pokémon data.");
    hideLoader();
  }
}

function renderStatBars(stats, pillColor) {
  document.querySelectorAll(".stat-bar .pill").forEach((pill) => {
    pill.classList.remove("filled");
    pill.style.background = "";
  });

  stats.forEach((stat) => {
    const statName = stat.stat.name;
    const statValue = stat.base_stat;
    const maxValue = statsMaxValue[statName];
    const filledCount = Math.round((statValue / maxValue) * 20);

    const row = document.querySelector(`.stat-row[data-stat="${statName}"]`);
    if (!row) return;

    const statValueText = row.querySelector(".stat-value");
    if (statValueText) {
      statValueText.textContent = statValue;
    }

    const pills = row.querySelectorAll(".stat-bar .pill");
    pills.forEach((pill, index) => {
      if (index < filledCount) {
        setTimeout(() => {
          pill.classList.add("filled");
          pill.style.background = pillColor;
        }, index * 100);
      }
    });
  });
}

async function getPokemonDescription(pokemonData) {
  const flavorTextContainer = document.querySelector("#flavored-text");
  const baseName = pokemonData.name.toLowerCase().split("-")[0]; /// this is to get the base pokemon description because the mega or gmax evolution has no description
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon-species/${baseName}`
    );
    const speciesData = await response.json();

    const englishEntries = speciesData.flavor_text_entries.filter(
      (entry) => entry.language.name === "en"
    );
    const uniqueDescriptions = [
      ...new Set(englishEntries.map((entry) => entry.flavor_text)),
    ];
    const cleanedDescriptions = uniqueDescriptions.map((desc) =>
      desc.replace(/[\n\f]/g, " ").trim()
    );
    const output = cleanedDescriptions.slice(0, 2).join(" ");
    flavorTextContainer.textContent = output;
  } catch (error) {
    console.error(
      "No Description for Mega or Gmax Evolutions or any other evolutions"
    );
  }
}

function getPokemonType(pokemonData) {
  const pokemonType = pokemonData.types[0].type.name;
  const pokemonName = pokemonData.name;
  // pokemonTypeDisplay.textContent = pokemonType;

  let bgColor;
  let pillColor = "";
  let textColor = "var(--dark)";
  let graphColor = "var(--lightgray)";
  const isMega = pokemonName.includes("-mega");
  const isGmax = pokemonName.includes("-gmax");
  if (isMega) {
    bgColor =
      "radial-gradient(at bottom center,rgba(232, 240, 2, 1) 1%, rgba(44, 222, 77, 1) 32%, rgba(50, 185, 252, 1) 58%, rgba(252, 50, 192, 1) 99%)";
    textColor =
      "radial-gradient(at bottom center, rgba(50, 185, 252, 1), rgba(252, 50, 192, 1))";
    graphColor = "#b82bdb";
    pillColor = "linear-gradient(to bottom, rgba(50, 185, 252, 1), #c914f7)";
  } else if (isGmax) {
    bgColor = "radial-gradient(circle at top, #F5587B, #D91656, #61055f)";
    textColor = "radial-gradient(at bottom center, #F5587B, #D91656)";
    graphColor = "#D91656";
    pillColor = "linear-gradient(to bottom, #F5587B, #D91656, #61055f)";
  } else {
    switch (pokemonType) {
      case "fire":
        bgColor = "radial-gradient(circle at top, #F9CB43, #FBA518, #E52020)";
        textColor = "#FBA518";
        graphColor = "#e53e20";
        pillColor =
          "linear-gradient(to bottom,rgb(249, 191, 67), #FBA518, #E52020)";
        break;
      case "water":
        bgColor = "radial-gradient(circle at top, #BBFBFF, #8DD8FF, #4E71FF)";
        textColor = " #8DD8FF";
        graphColor = "#4E71FF";
        pillColor = "linear-gradient(to bottom, #8DD8FF, #4E71FF)";
        break;
      case "grass":
        bgColor = "radial-gradient(circle at top, #9BEC00, #4fc029, #12b923)";
        textColor = "#44b31f";
        graphColor = "#12b923";
        pillColor = "linear-gradient(to bottom, #9BEC00,#4fc029, #12b923)";
        break;
      case "electric":
        bgColor =
          "radial-gradient(circle at top,rgb(255, 224, 111),rgb(226, 166, 37))";
        textColor = "#ebc746";
        graphColor = "#ffae00";
        pillColor = "linear-gradient(to bottom,rgb(255, 218, 84), #ffae00)";
        break;
      case "ice":
        bgColor = "radial-gradient(circle at top, #D9EAFD, #A2D2FF, #1B56FD)";
        textColor = " #A2D2FF";
        graphColor = " #1B56FD";
        pillColor = "linear-gradient(to bottom, #A2D2FF, #1B56FD)";
        break;
      case "fighting":
        bgColor =
          "radial-gradient(circle at top, #D84040, #8E1616,hsl(0, 13.70%, 10.00%))";
        textColor = "#8e1616";
        graphColor = "#b32727";
        pillColor = "linear-gradient(to bottom,  #D84040, #8E1616)";
        break;
      case "poison":
        bgColor = "radial-gradient(circle at top, #B2A5FF, #7965C1, #483AA0)";
        textColor = " #7965C1";
        graphColor = " #7965C1";
        pillColor = "linear-gradient(to bottom,  #7965C1, #483AA0))";
        break;
      case "ground":
        bgColor = "radial-gradient(circle at top, #F8E1B7, #CBA35C, #543A14)";
        textColor = " #CBA35C";
        graphColor = " #CBA35C";
        pillColor = "linear-gradient(to bottom,   #CBA35C, #543A14)";
        break;
      case "flying":
        bgColor = "radial-gradient(circle at top,#cfcdcd, #DDDDDD, #7a8b8b)";
        textColor = " #7a8b8b";
        graphColor = " #7a8b8b";
        pillColor = "linear-gradient(to bottom,#c7c7c7,#575757)";
        break;
      case "psychic":
        bgColor = "radial-gradient(circle at top, #FEC5F6, #DB8DD0,#B33791)";
        textColor = "#DB8DD0";
        graphColor = " #B33791";
        pillColor = "linear-gradient(to bottom, #DB8DD0,#cc48a9)";
        break;
      case "bug":
        bgColor = "radial-gradient(circle at top, #c7da7e, #A4B465, #626F47)";
        textColor = " #A4B465";
        graphColor = " #A4B465";
        pillColor = "linear-gradient(to bottom,#c2d86c, #A4B465)";
        break;
      case "rock":
        bgColor = "radial-gradient(circle at top, #dab27e, #A08963, #706D54)";
        textColor = " #706D54";
        graphColor = " #dab27e";
        pillColor = "linear-gradient(to bottom, #dab27e, #A08963)";
        break;
      case "ghost":
        bgColor = "radial-gradient(circle at top, #7965C1, #483AA0, #0E2148)";
        textColor = " #483AA0";
        graphColor = " #7965C1";
        pillColor = "linear-gradient(to bottom, #7965C1, #483AA0)";
        break;
      case "dragon":
        bgColor =
          "radial-gradient(circle at top, #7A73D1, #4D55CC,rgb(45, 38, 173))";
        textColor = "#4D55CC";
        graphColor = "#4D55CC";
        pillColor = "linear-gradient(to bottom, #7A73D1,#3a42bb)";
        break;
      case "dark":
        bgColor = "radial-gradient(circle at top, #7F8CAA, #3F3351, #222831)";
        textColor = "#3F3351";
        graphColor = "#3F3351";
        pillColor = "linear-gradient(to bottom,#66728d, #3F3351)";
        break;
      case "steel":
        bgColor = "radial-gradient(circle at top, #EAEFEF, #B8CFCE, #7F8CAA)";
        textColor = "#7F8CAA";
        graphColor = "#7F8CAA";
        pillColor = "linear-gradient(to bottom,#95a9b9,#576481)";
        break;
      case "fairy":
        bgColor = "radial-gradient(circle at top, #FFEDFA, #FFB8E0, #EC7FA9)";
        textColor = "#EC7FA9";
        graphColor = "#EC7FA9";
        pillColor = "linear-gradient(to bottom, #FFB8E0, #EC7FA9)";
        break;
      case "normal":
        bgColor = "radial-gradient(circle at top, #F2F2F2, #EAE4D5, #B6B09F)";
        textColor = "#B6B09F";
        graphColor = "#B6B09F";
        pillColor = "linear-gradient(to bottom,#dacaa3,rgb(156, 147, 121))";
        break;
      default:
        bgColor = "#68A090";
        break;
    }
  }

  const pokebackground = document.querySelector(".pokemon-bg");
  pokebackground.style.background = bgColor;
  document.querySelector(".pokemon-title").style.background = textColor;
  pokemonNameTitle.style.color = "#fdfaf6";
  pokemonNameTitle.style.textShadow = "0px 0px 5px #121212";
  pokebackground.style.maskImage = `url("pictures/${pokemonType}.svg")`;
  pokebackground.classList.remove("fromTop");
  void pokebackground.offsetWidth;
  pokebackground.classList.add("fromTop");

  return {
    pillColor,
    graphColor,
  };
}

function displayError(message) {
  errorDisplay.textContent = message;
  errorDisplay.classList.add("error-display");
  errorContainer.style.display = "flex";
}
