import { getPokemonData, displayData, pokemonName } from "./index.js";

export function heightComparison(pokemonData, pokemonSprite) {
  const pokemonSpriteImg = document.querySelector("#pokemon-height");
  const humanImg = document.querySelector("#human-height");
  const pokemonHeightDisplay = document.querySelector("#pokemon-height-value");
  const humanHeightDisplay = document.querySelector("#human-height-value");
  const humanHeightM = 1.43;
  const maxPixelHeight = 235 - 16;

  const pokemonHeightM = pokemonData.height / 10;

  const maxHeight = Math.max(humanHeightM, pokemonHeightM);
  const pixelsPerMeter = maxPixelHeight / maxHeight;

  const humanPixelHeight = (humanHeightM * pixelsPerMeter).toFixed(2);
  const pokemonPixelHeight = (pokemonHeightM * pixelsPerMeter).toFixed(2);

  humanImg.style.height = `${humanPixelHeight}px`;
  humanImg.style.aspectRatio = "1/2";

  pokemonSpriteImg.style.height = `${pokemonPixelHeight}px`;
  pokemonSpriteImg.style.aspectRatio = "1/1";

  pokemonSpriteImg.style.maskImage = `url(${pokemonSprite})`;
  pokemonSpriteImg.style.webkitMaskImage = `url(${pokemonSprite})`;

  const pokemonTotalInches = pokemonHeightM * 39.3701;
  const pokemonToFeet = Math.floor(pokemonTotalInches / 12);
  const pokemonToInches = Math.round(pokemonTotalInches % 12);

  const humanTotalInches = humanHeightM * 39.3701;
  const humanToFeet = Math.floor(humanTotalInches / 12);
  const humanToInches = Math.round(humanTotalInches % 12);

  pokemonHeightDisplay.textContent = `${pokemonToFeet}'${pokemonToInches} feet`;
  humanHeightDisplay.textContent = `${humanToFeet}'${humanToInches} feet`;
}
export async function getpokemonTypes(pokemonData) {
  const container = document.querySelector("#type-container");
  container.innerHTML = "";
  const types = pokemonData.types.map((t) => t.type.name);

  types.forEach((type) => {
    const span = document.createElement("span");
    span.textContent = type;
    span.className = `type-container ${type}-type`;
    container.appendChild(span);
  });
}
export async function getpokemonEvolutions(pokemonData) {
  const pokemonSpecies = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species/${pokemonData.name}`
  );
  const container = document.querySelector(".evolution-chart-container");
  if (!pokemonSpecies.ok) {
    container.style.display = "none";
    throw new Error("this pokemon has no evolution");
  }
  const pokemonEvolution = await pokemonSpecies.json();
  const evoUrl = pokemonEvolution.evolution_chain.url;
  const evoRes = await fetch(evoUrl);
  if (!evoRes.ok) {
    throw new Error("evolution chain not fetch");
  }
  const evoData = await evoRes.json();
  ///this function will get all the data for each node
  function traverse(chainNode, collected = []) {
    if (!chainNode) return collected;

    collected.push(chainNode.species.name);
    for (const evolution of chainNode.evolves_to) {
      traverse(evolution, collected);
    }
    return collected;
  }

  const evolutionNames = traverse(evoData.chain);

  ///this will return each evolution to an object that contains name and sprite
  const evolutions = await Promise.all(
    evolutionNames.map(async (name) => {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      if (!res.ok) return { name, sprite: null, type: null };

      const data = await res.json();
      return {
        name,
        sprite: data.sprites.other["official-artwork"].front_default,
        type: data.types[0]?.type.name || null, // get the first type safely
      };
    })
  );
  renderEvolutionCards(evolutions);
  console.log(evolutions);
}
export function renderEvolutionCards(evolutions) {
  const container = document.querySelector("#evolution-chart");
  container.innerHTML = ""; // clear old cards

  evolutions.forEach((evolution) => {
    const card = document.createElement("button");
    card.className = "evolution-card";

    const imgContainer = document.createElement("div");
    imgContainer.className = "evolution-img-container";

    const img = document.createElement("img");
    img.src = evolution.sprite || "";
    img.alt = evolution.name;
    imgContainer.appendChild(img);

    const nameDiv = document.createElement("div");
    nameDiv.className = `evolution-name ${evolution.type}-type`;
    nameDiv.innerHTML = `<h2>${capitalize(evolution.name)}</h2>`;

    card.appendChild(imgContainer);
    card.appendChild(nameDiv);

    card.addEventListener("click", async () => {
      try {
        const pokemonData = await getPokemonData(evolution.name);
        displayData(pokemonData);
        pokemonName(evolution.name);
      } catch (error) {
        console.error("Failed to load evolution:", error);
        displayError("Failed to load this evolution.");
      }
    });

    container.appendChild(card);
  });
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
