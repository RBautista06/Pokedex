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
    throw new Error("This Pokémon has no evolution.");
  }

  const pokemonSpeciesData = await pokemonSpecies.json();
  const evoUrl = pokemonSpeciesData.evolution_chain.url;
  const evoRes = await fetch(evoUrl);
  if (!evoRes.ok) {
    throw new Error("Evolution chain could not be fetched.");
  }

  const evoData = await evoRes.json();

  function traverse(chainNode, collected = []) {
    if (!chainNode) return collected;
    collected.push(chainNode.species.name);
    for (const evolution of chainNode.evolves_to) {
      traverse(evolution, collected);
    }
    return collected;
  }

  const evolutionNames = traverse(evoData.chain);

  const evolutions = await Promise.all(
    evolutionNames.map(async (name) => {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
      if (!res.ok) return { name, sprite: null, type: null, forms: [] };

      const data = await res.json();
      const type = data.types[0]?.type.name || null;

      // Get other forms via species API
      const speciesRes = await fetch(data.species.url);
      const speciesData = await speciesRes.json();

      // Fetch all varieties (includes megas/gmax etc.)
      const forms = await Promise.all(
        speciesData.varieties
          .filter((v) => v.pokemon.name !== name) // Skip base form
          .map(async (variant) => {
            const formRes = await fetch(variant.pokemon.url);
            if (!formRes.ok) return null;
            const formData = await formRes.json();

            return {
              name: formData.name,
              sprite: formData.sprites.other["official-artwork"].front_default,
              type: formData.types[0]?.type.name || null,
            };
          })
      );

      return {
        name,
        sprite: data.sprites.other["official-artwork"].front_default,
        type,
        forms: forms.filter((f) => f && f.sprite), // Remove nulls or empty images
      };
    })
  );

  renderEvolutionCards(evolutions);
}

export function renderEvolutionCards(evolutions) {
  const container = document.querySelector("#evolution-chart");
  container.innerHTML = ""; // Clear old cards
  evolutions.forEach((evolution) => {
    appendCard(evolution, container);

    // Add additional forms (Mega, Gmax, etc.)
    if (Array.isArray(evolution.forms)) {
      evolution.forms.forEach((form) => appendCard(form, container));
    }
  });
}

function appendCard(pokemon, container) {
  const card = document.createElement("button");
  card.className = "evolution-card";

  const imgContainer = document.createElement("div");
  imgContainer.className = "evolution-img-container";

  const img = document.createElement("img");
  img.src = pokemon.sprite || "";
  img.alt = pokemon.name;
  imgContainer.appendChild(img);

  const nameDiv = document.createElement("div");
  nameDiv.className = `evolution-name ${pokemon.type}-type`;
  nameDiv.innerHTML = `<h2>${capitalize(pokemon.name)}</h2>`;

  card.appendChild(imgContainer);
  card.appendChild(nameDiv);

  card.addEventListener("click", async () => {
    try {
      const pokemonData = await getPokemonData(pokemon.name);
      displayData(pokemonData);
      pokemonName(pokemon.name);
      window.scrollTo({
        top: 0,
        behavior: "smooth", // optional for smooth scrolling
      });
    } catch (error) {
      console.error("Failed to load evolution:", error);
      displayError("Failed to load this evolution.");
    }
  });

  container.appendChild(card);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
