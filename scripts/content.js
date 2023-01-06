const countries = ["JP", "US"]
const emojis = ["🇯🇵", "🇺🇸"]

const sidebarNode = document.querySelector("td#rightcolumn")
const firstSpacingSidebarNode = sidebarNode.querySelector("br[style='clear: left']")

const albumLinksHeader = document.createElement("div")
albumLinksHeader.style = "width: 250px; background-color: #1B273D;"
albumLinksHeader.innerHTML = `<b class="rtop"><b></b></b><div style="padding: 6px 10px 0px 10px"><h3>Album iTunes Links</h3></div>`

const albumLinksBody = document.createElement("div")
albumLinksBody.style = "width: 250px; background-color: #2F364F;"
// div.smallfont
const divSmallfont = document.createElement("div")
divSmallfont.className = "smallfont"
divSmallfont.style = "padding: 10px 10px 6px 10px"
// b.rbot
const bRbot = document.createElement("b")
bRbot.className = "rbot"
bRbot.innerHTML = `<b></b>`

const countryDivMap = new Map();
for (let i = 0; i < countries.length; i++) {
    const countryDiv = document.createElement("div")
    countryDiv.style = "margin-bottom: 10px;"

    const icon = document.createElement("img")
    icon.src = "/db/img/arrowbit.gif"
    icon.alt = ""
    countryDiv.appendChild(icon)

    const label = document.createElement("b")
    label.className = "label"
    label.innerText = ` iTunes ${countries[i]} ${emojis[i]}`
    countryDiv.appendChild(label)

    const spacing = document.createElement("br")
    countryDiv.appendChild(spacing)

    countryDiv.innerHTML += " Loading..."

    countryDivMap.set(countries[i], countryDiv)
    divSmallfont.appendChild(countryDiv)
}

albumLinksBody.append(divSmallfont, bRbot)

const albumLinksSpacing = document.createElement("br")
albumLinksSpacing.style = "clear: left;"

firstSpacingSidebarNode.after(albumLinksHeader, albumLinksBody, albumLinksSpacing)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const innermainNode = document.querySelector("div#innermain");

/**
 * Album names
 */
let albumNameJP = "";
let albumNames = [];
// Album name JP
const albumTitleJPNode = innermainNode.querySelector("span.albumtitle[lang='ja']");
albumNameJP = albumTitleJPNode.innerText.replace(/^ \/ /, "").replace(/ \[.+\]$/, "")
console.log("albumNameJP", albumNameJP)
// Album names
const albumTitleNodes = innermainNode.querySelectorAll("span.albumtitle[style='display:inline']");
albumTitleNodes.forEach((value, key, parent) => {
    albumNames.push(...value.innerHTML.split("<br>").filter((value) => value && value !== albumNameJP))
})
albumNames = albumNames.map((albumName) => albumName.replace(/ \[.+\]$/, ""))
const albumNamesSet = new Set(albumNames)
console.log("albumNames", albumNamesSet)

/**
 * UPCs
 */
const upcs = [];
// Barcode
const albumInfoNode = innermainNode.querySelector("div#rightfloat table#album_infobit_large");
for (const row of albumInfoNode.rows) {
    if (row.innerText.trim() === "") {
        break
    }
    const rowNameNode = row.querySelector("td")
    const rowName = rowNameNode.querySelector("b").innerHTML.trim()
    if (rowName === "Barcode") {
        const rowValue = rowNameNode.nextElementSibling.innerHTML.trim()
        upcs.push(rowValue)
    }
}
// iTunes / Spotify UPC
const albumNotesNode = innermainNode.querySelector("div#notes");
const regex = /iTunes[^\.\n]+UPC (\d+)/;
const matches = albumNotesNode.innerHTML.match(regex)
if (matches && matches.length > 1) {
    upcs.push(matches[1])
}
console.log("upcs", upcs)

/**
 * Product names
 */
const productNamesSet = new Set();
const albumStatsNode = sidebarNode.querySelector("div[style='width: 250px; background-color: #2F364F;']")
const albumStatsRowNodes = albumStatsNode.querySelectorAll("div.smallfont > div")
albumStatsRowNodes.forEach((row) => {
    const rowLabel = row.querySelector("b.label")
    if (rowLabel && rowLabel.innerText.trim() === "Products represented") {
        // Find product names with links
        const byLinks = row.querySelectorAll("span.productname")
        byLinks.forEach((value) => {
            productNamesSet.add(value.innerText.trim())
        })

        // Find product names with text
        const byText = row.querySelectorAll("br")
        byText.forEach((value) => {
            const text = value.nextSibling
            if (text && text.nodeValue && text.nodeValue.trim()) {
                productNamesSet.add(value.nextSibling.nodeValue.trim())
            }
        })
    }
})
console.log("productNames", productNamesSet)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const filterArtistIDs = [
    1186533981, // Uta-Cha-Oh (karoke cover anisongs)
]
const skipProductNames = [
    "The Legend of Zelda",
    "Splatoon",
    "Super Smash Bros",
    "Super Mario",
    "Mario Kart",
    "Kid Icarus",
    "Animal Crossing"
]
async function itunesRequest(country) {
    if (Array.from(productNamesSet).find(productName => skipProductNames.find(toSkip => productName.includes(toSkip)))) {
        return [];
    }

    let results = [];

    const lookupUrl = `https://itunes.apple.com/lookup?country=${country}&upc=${upcs.join(",")}&lang=en_us`
    const lookup = await (await fetch(lookupUrl)).json();
    results.push(...lookup.results)
    if (lookup && lookup.results && lookup.results.length === 0) {
        console.log(`[iTunes ${country}] Lookup by UPC failed! Search by JP name...`)
        const searchUrl = `https://itunes.apple.com/search?country=${country}&term=${encodeURIComponent(albumNameJP)}&media=music&entity=album&lang=en_us`
        const search = await (await fetch(searchUrl)).json();
        results.push(...search.results)
        if (search && search.results && search.results.length === 0) {
            console.log(`[iTunes ${country}] Search by JP name failed! Search by the ${albumNamesSet.size} other names...`)
            for (const albumName of albumNamesSet) {
                const searchUrl = `https://itunes.apple.com/search?country=${country}&term=${encodeURIComponent(albumName)}&media=music&entity=album&lang=en_us`
                const search = await (await fetch(searchUrl)).json();
                results.push(...search.results)
            }
            if (results.length === 0) {
                console.log(`[iTunes ${country}] Search by the ${albumNamesSet.size} other names failed! Search by the ${productNamesSet.size} product names...`)
                for (const productName of productNamesSet) {
                    const searchUrl = `https://itunes.apple.com/search?country=${country}&term=${encodeURIComponent(productName)}&media=music&entity=album&lang=en_us`
                    const search = await (await fetch(searchUrl)).json();
                    results.push(...search.results)
                }
            }
        }
    }

    // Filter, unique & sort
    const albums = uniqueById(results.filter((result) => !filterArtistIDs.includes(result.artistId)))
    albums.sort((a, b) => {
        const dateA = new Date(a.releaseDate).getTime()
        const dateB = new Date(b.releaseDate).getTime()
        if (dateA === dateB) {
            return a.collectionId - b.collectionId
        }
        return dateA - dateB
    })
    return albums;
}

for (let i = 0; i < countries.length; i++) {
    const countryDiv = countryDivMap.get(countries[i])
    itunesRequest(countries[i])
        .then((albums) => {
            if (albums.length === 0) {
                countryDiv.innerHTML = countryDiv.innerHTML.replace(" Loading...", "No Results")
                return
            }

            const table = document.createElement("table")
            const tbody = table.createTBody()

            let idx = 0;
            for (const album of albums) {
                if (idx > 4) {
                    break
                }
                const row = tbody.insertRow()
                const leftCell = row.insertCell()
                leftCell.style = "text-align: center;"
                const rightCell = row.insertCell()

                const albumLink = document.createElement("a")
                albumLink.href = album.collectionViewUrl
                albumLink.target = "_blank"
                albumLink.rel = "noopener noreferrer"

                const albumLabel = document.createElement("h4")
                albumLabel.className = "label"
                albumLabel.style = "font-weight: normal; margin-top: 3px;"
                albumLabel.innerText = album.collectionId

                const albumArtworkDiv = document.createElement("div")
                albumArtworkDiv.style = "background: #000000; border-radius: 4px; width: 60px; height: 60px; display: flex; justify-content: center; align-items: center;"
                const albumArtworkImg = document.createElement("img")
                albumArtworkImg.src = album.artworkUrl60
                albumArtworkImg.style = "border-radius: 4px; transition: opacity .1s ease-in; box-shadow: 0 1px 1px rgba(0,0,0,.01),0 2px 2px rgba(0,0,0,.01),0 4px 4px rgba(0,0,0,.02),0 8px 8px rgba(0,0,0,.03),0 14px 14px rgba(0,0,0,.03);"
                albumArtworkImg.addEventListener('mouseover', function handleMouseOver() {
                    albumArtworkImg.style.opacity = '.7';
                });
                albumArtworkImg.addEventListener('mouseout', function handleMouseOut() {
                    albumArtworkImg.style.opacity = '1';
                });
                albumArtworkDiv.appendChild(albumArtworkImg)
                albumLink.appendChild(albumArtworkDiv)

                const ul = document.createElement("ul")
                ul.style = "list-style: none;padding-left: 10px;"
                const albumInfoList = [
                    `${album.collectionName} / ${album.artistName}`,
                    new Date(album.releaseDate).toLocaleDateString('en-us', { year: "numeric", month: "short", day: "2-digit" }),
                    `${album.trackCount} tracks (${album.collectionPrice ? album.collectionPrice : "—"} ${album.currency})`
                ]
                for (const albumInfo of albumInfoList) {
                    const li = document.createElement("li")
                    li.className = "smallfont"
                    li.innerText = albumInfo
                    ul.appendChild(li)
                }

                leftCell.appendChild(albumLink)
                leftCell.appendChild(albumLabel)
                rightCell.appendChild(ul)
                idx++
            }

            countryDiv.innerHTML = countryDiv.innerHTML.replace(" Loading...", "")
            countryDiv.appendChild(table)
            if (albums.length > 5) {
                countryDiv.innerHTML += `...and ${albums.length - 5} other results`
            }
        });
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Remove duplicates from array.
// https://dev.to/marinamosti/removing-duplicates-in-an-array-of-objects-in-js-with-sets-3fep#comment-a65g
const uniqByProp = prop => arr =>
    Array.from(
        arr
            .reduce(
                (acc, item) => (
                    item && item[prop] && acc.set(item[prop], item),
                    acc
                ), // using map (preserves ordering)
                new Map()
            )
            .values()
    );

const uniqueById = uniqByProp("collectionId");
