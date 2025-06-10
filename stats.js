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
export async function getPokemonEvolutions(pokemonData, shouldReset = true) {
  const baseSpeciesRes = await fetch(pokemonData.species.url);
  if (!baseSpeciesRes.ok) {
    console.error("Could not fetch base species from form");
    return;
  }
  const baseSpeciesData = await baseSpeciesRes.json();

  const evoUrl = baseSpeciesData.evolution_chain.url;
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

      const speciesRes = await fetch(data.species.url);
      const speciesData = await speciesRes.json();

      const forms = await Promise.all(
        speciesData.varieties
          .filter((v) => v.pokemon.name !== name)
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
        forms: forms.filter((f) => f && f.sprite),
      };
    })
  );

  renderEvolutionCards(evolutions, shouldReset);
}

export function renderEvolutionCards(evolutions, shouldReset = true) {
  const container = document.querySelector("#evolution-chart");
  if (shouldReset) container.innerHTML = "";

  evolutions.forEach((evolution) => {
    appendCard(evolution, container);

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
      const pokemonInput = document.querySelector("#searchInput");
      pokemonInput.value = capitalize(pokemon.name);

      displayData(pokemonData); // assumes displayData handles everything (loader, sprite, etc.)
      pokemonName(pokemon.name);

      await getPokemonEvolutions(pokemonData, true); // ✅ Always reset to prevent stacking

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Failed to load evolution:", error);
      displayError("Failed to load this evolution.");
    }
  });

  container.appendChild(card);
}

function capitalize(word) {
  return word
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
