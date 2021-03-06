// FILE: scriptures.js
// AUTHOR: Alle Baker
// DATE: Winter 2022

/* property
    books, classKey, content, forEach, hash, href, id, init, location, log,
    maxBookId, minBookId, onHashChanged, onerror, onload, open, parse, push,
    response, send, status*/


const Scriptures = (function () {
    "use strict";

    //Constants
    const BOTTOM_PADDING = "<br /><br />";
    const CLASS_BOOKS = "books";
    const CLASS_CHAPTER = "chapter";
    const CLASS_VOLUME = "volume";
    const CLASS_BUTTON = "btn";
    const DIV_BREADCRUMBS ="crumbs";
    const DIV_SCRIPTURES_NAVIGATOR = "scripnav";
    const DIV_SCRIPTURES = "scriptures";
    const INDEX_PLACENAME = 2;
    const INDEX_FLAG = 11;
    const INDEX_LATITUDE = 3;
    const INDEX_LONGITUDE = 4;
    const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),'(.*)'\)/;
    const REQUEST_GET = "GET";
    const REQUEST_STATUS_OK = 200;
    const REQUEST_STATUS_ERROR = 400;
    const TAG_HEADERS = "h5";
    const TAG_LIST_ITEM = "li";
    const TAG_UNORDERED_LIST = "ul";
    const TEXT_TOP_LEVEL = "The Scriptures";
    const URL_BASE = "https://scriptures.byu.edu/";
    const URL_BOOKS = `${URL_BASE}mapscrip/model/books.php`;
    const URL_SCRIPTURES = `${URL_BASE}mapscrip/mapgetscrip.php`;
    const URL_VOLUMES = `${URL_BASE}mapscrip/model/volumes.php`;

    //Private Variables
    let books;
    let gmMarkers = [];
    let requestedBookId;
    let requestedChapter;
    let volumes;

    //Private Method Declarations
    let addMarker;
    let ajax;
    let bookChapterValid;
    let booksGrid;
    let booksGridContent;
    let cacheBooks;
    let chaptersGrid;
    let chaptersGridContent;
    let clearMarkers;
    let encodedScripturedUrlParameters;
    let getScripturesCallback;
    let getScripturesFailure;
    let htmlAnchor;
    let htmlDiv;
    let htmlElement;
    let htmlListItem;
    let htmlListItemLink;
    let htmlLink;
    let init;
    let injectBreadcrumbs;
    let navigateBook;
    let navigateChapter;
    let nextChapter;
    let navigateHome;
    let onHashChanged;
    let previousChapter;
    let setupMarkers;
    let showLocation;
    let titleForBookChapter;
    let volumeForId;
    let volumesGridContent;
  
    //Private Methods
    addMarker = function (placename, latitude, longitude) {
        //NEEDSWORD check to see if we already have this let/lon in the gmMarkers array
        let marker = new markerWithLabel.MarkerWithLabel({
            position: {lat: Number(latitude), lng: Number(longitude)},
            map: map,
            labelContent: placename,
            labelAnchor: new google.maps.Point(10, -15),
            labelClass: "labels",
            labelStyle: {opacity: 1.0},
            //title: placename,
            animation: google.maps.Animation.DROP,
            //latlng: new google.maps.latlng(latitude, longitude),
        });

        // marker.addListener("click", () => {
        //     infowindow.open({
        //         anchor: marker,
        //         map,
        //         shouldFocus: false,
        //     });
        // });

        // const contentString = placename;

        // const infowindow = new google.maps.InfoWindow({
        //     content: contentString,
        // }) ;
        gmMarkers.push(marker);
    };
    ajax = function (url, successCallback, failureCallback, skipJsonParse) {
        let request = new XMLHttpRequest();

        request.open(REQUEST_GET, url, true);

        request.onload = function () {
            if (request.status >= REQUEST_STATUS_OK && request.status < REQUEST_STATUS_ERROR) {
                // Success!
                let data = (skipJsonParse ? request.response : JSON.parse(request.response));

                if (typeof successCallback === "function") {
                    successCallback(data);
                }
            } else {
                // We reached our target server, but it returned an error
                if (typeof failureCallback === "function") {
                    failureCallback(request);
                }
            }
        };
        request.onerror = failureCallback;
        request.send();
    };

    bookChapterValid = function (bookId, chapter) {
        let book = books[bookId];

        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }

        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }

        return true;
    };

    booksGrid = function (volume) {
        return htmlDiv({
            classKey: CLASS_BOOKS,
            content: booksGridContent(volume)
        });
    };

    booksGridContent = function (volume) {
        let gridContent = "";

        volume.books.forEach(function (book) {
            gridContent += htmlLink ({
                classKey: CLASS_BUTTON,
                id: book.id,
                href: `#${volume.id}:${book.id}`,
                content: book.gridName
            });
        });

        return gridContent;
    };

    cacheBooks = function (callback) {
        volumes.forEach(volume => {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }
            volume.books = volumeBooks;
        });

        if (typeof callback === "function") {
            callback();
        }
    };

    chaptersGrid = function (book) {
        return htmlDiv({
            classKey: CLASS_VOLUME,
            content: htmlElement(TAG_HEADERS, book.fullName)
        }) + htmlDiv({
            classKey: CLASS_BOOKS,
            content: chaptersGridContent(book)
        });
    };

    chaptersGridContent = function (book) {
        let gridContent = "";
        let chapter = 1;

        while (chapter <= book.numChapters) {
            gridContent += htmlLink({
                classKey: `${CLASS_BUTTON} ${CLASS_CHAPTER}`,
                id: chapter,
                href: `#0:${book.id}:${chapter}`,
                content: chapter
            });
            chapter += 1;
        }
        return gridContent;
    };

    clearMarkers = function () {
        gmMarkers.forEach(function (marker) {
            marker.setMap(null);
        });

        gmMarkers = [];
    }

    encodedScripturedUrlParameters = function (bookId, chapter, verses, isJst) {
        if (bookId !== undefined && chapter !== undefined) {
            let options = "";

            if (verses !== undefined) {
                options += verses;
            }
            if (isJst !== undefined) {
                options += "&jst=JST";
            }

            return `${URL_SCRIPTURES}?book=${bookId}&chap=${chapter}&verses${options}`;
        }
    };

    getScripturesCallback = function (chapterHtml) {
        let book = books[requestedBookId];

        document.getElementById(DIV_SCRIPTURES).innerHTML = chapterHtml;
        
        for (const div of document.getElementsByClassName("navheading")){
            div.innerHTML += "<div class=\"nextprev\"><a href=\"#0:201:0\">NextPrev</a></div>";
        
        }

        if (book !== undefined) {
            injectBreadcrumbs(volumeForId, book.parentBookId), book, requestedChapter;
        } else {
            injectBreadcrumbs ();
        }
        setupMarkers();
    };

    getScripturesFailure = function () {
        document.getElementById(DIV_SCRIPTURES).innerHTML = "Unable to retrieve chapter contents."
        injectBreadcrumbs();
    };
    //idk where he wanted this put in so im putting it in here
    htmlAnchor = function (volume) {
        return `<a name="v${volume.id}" />`;
    };

    htmlDiv = function (parameters) {
        let classString = "";
        let contentString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }
        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }
        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }
        return `<div${idString}${classString}>${contentString}</div>`;
    };

    htmlElement = function (tagName, content) {
        return `<${tagName}>${content}</${tagName}>`;
    };

    htmlListItem = function (content) {
        return htmlElement(TAG_LIST_ITEM, content);
    };

    htmlListItemLink = function (content, href = "") {
        return htmlListItem(htmlLink({content, href: `#${href}`}));
    };

    htmlLink = function (parameters) {
        let classString = "";
        let contentString = "";
        let hrefString = "";
        let idString = "";

        if (parameters.classKey !== undefined) {
            classString = ` class="${parameters.classKey}"`;
        }
        if (parameters.content !== undefined) {
            contentString = parameters.content;
        }
        if (parameters.href !== undefined) {
            hrefString = ` href="${parameters.href}"`;
        }
        if (parameters.id !== undefined) {
            idString = ` id="${parameters.id}"`;
        }
        return `<a${idString}${classString}${hrefString}>${contentString}</a>`;
    };

    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;
        
        /*ajax(URL_VOLUMES, function (data) {
            books = data;
            booksLoaded = true;
            
            if (volumesLoaded) {
                cacheBooks(callback);
            }
        });*/
        ajax("https://scriptures.byu.edu/mapscrip/model/books.php",
            data => {
                books = data;
                booksLoaded = true;
                // console.log("Loaded books from server");
                // console.log(data);

                if (volumesLoaded) {
                    cacheBooks(callback);
                }
            }
        );
        ajax("https://scriptures.byu.edu/mapscrip/model/volumes.php",
            data => {
                volumes = data;
                volumesLoaded = true;
                // console.log("Loaded volumes from server");
                // console.log(data);

                if (booksLoaded) {
                    cacheBooks(callback);
                }
            }
        );
    };

    injectBreadcrumbs = function (volume, book, chapter) {
        let crumbs = "";

        if (volume === undefined) {
            crumbs = htmlListItem(TEXT_TOP_LEVEL);
        } else {
            crumbs = htmlListItemLink(TEXT_TOP_LEVEL);

            if (book === undefined) {
                crumbs += htmlListItem(volume.fullName);
            } else {
                crumbs += htmlListItemLink(volume.fullName, volume.id);
                
                if (chapter === undefined || chapter <= 0) {
                    crumbs += htmlListItem(book.tocName);
                } else {
                    crumbs += htmlListItemLink(book.tocName, `${volume.id}:${book.id}`);
                    crumbs += htmlListItem(chapter);
                }
            }
        }

        document.getElementById(DIV_BREADCRUMBS).innerHTML = htmlElement(TAG_UNORDERED_LIST, crumbs);
    };

    navigateBook = function (bookId) {
        let book = books[bookId];

        if (book.numChapters <= 1) {
            navigateChapter(bookId, book.numChapters);
        } else {
            document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
                id: DIV_SCRIPTURES_NAVIGATOR,
                content: chaptersGrid(book)
            });
            injectBreadcrumbs(volumeForId(book.parentBookId), book);
        }
    };

    navigateChapter = function (bookId, chapter) {
        requestedBookId = bookId;
        requestedChapter = chapter;
        ajax(encodedScripturedUrlParameters(bookId, chapter), getScripturesCallback, getScripturesFailure, true);
    };

    navigateHome = function (volumeId) {
        document.getElementById(DIV_SCRIPTURES).innerHTML = htmlDiv({
            id: DIV_SCRIPTURES_NAVIGATOR,
            content: volumesGridContent(volumeId)
        });
        injectBreadcrumbs(volumeForId(volumeId));
    };

    nextChapter = function (book, chapter) {

        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [
                    bookId,
                    chapter + 1,
                    titleForBookChapter(book, chapter + 1)
                ];
            }
            let nextBook = books[bookId + 1];

            if (nextBook !== undefined) {
                let nextChapterValue = 0;
                if (nextBook.numChapters > 0) {
                    nextChapterValue = 1;
                }

                return[
                    nextBook.id,
                    nextChapterValue,
                    titleForBookChapter(nextBook, nextChapterValue)
                ];
            }
        }
    };

    onHashChanged = function () {
        let ids = [];

        if (location.hash !== "" && location.hash.length > 1) {
            ids = location.hash.slice(1).split(":");
        }

        if (ids.length <= 0) {
            navigateHome();
        } else if (ids.length === 1) {
            let volumeId = Number(ids[0]);

            if (volumeId < volumes[0].id || volumeId > volumes.slice(-1)[0].id) {
                navigateHome();
            } else {
                navigateHome(volumeId);
            }
        } else {
            let bookId = Number(ids[1]);

            if (books[bookId === undefined]) {
                navigateHome();
            } else {
                if (ids.length === 2) {
                    navigateBook(bookId)
                } else {
                    let chapter = Number(ids[2]);
                    if (bookChapterValid(bookId, chapter)) {
                        navigateChapter(bookId, chapter);
                    } else {
                        navigateHome();
                    }  
                }
            }
        }
        //console.log(window.location.hash);
    };

    previousChapter = function (bookId, chapter) {
        //NEEDSWORK: figure this out
    }

    var bounds = new google.maps.LatLngBounds();

    setupMarkers = function () {
        if (gmMarkers.length > 0) {
            clearMarkers();
        }

        let bounds = new google.maps.LatLngBounds();

        document.querySelectorAll("a[onclick^=\"showLocation(\"]").forEach(function (element) {
            let matches = LAT_LON_PARSER.exec(element.getAttribute("onclick"));

            if (matches) {
                let placename = matches[INDEX_PLACENAME];
                let latitude = matches[INDEX_LATITUDE];
                let longitude = matches[INDEX_LONGITUDE];
                let flag = matches[INDEX_FLAG];

                if (flag !== "") {
                    placename = `${placename} ${flag}`;
                }

                let position = new google.maps.LatLng(Number(latitude), Number(longitude));
                
                addMarker(placename, latitude, longitude)
                bounds.extend(position)
                //map.fitBounds(bounds);
            }
        });
        if (gmMarkers.length > 0) {
            map.fitBounds(bounds);
            map.setZoom(8);
        }
        //matches = /\((.*),'(.*)', (.*), (.*), (.*), (.*), (.*), (.*), (.*), (.*), '(.*)'\)/.exec("showLocation(108, 'Assyria',36.359410,43.152887,33.515336,44.551217,0.000000,0.000000,1202300.000000,0.000000,'>')")
    };

    showLocation = function showLocation(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        console.log(viewAltitude);
        if (gmMarkers.length > 0) {
            clearMarkers();
        }
        addMarker(placename, latitude, longitude);
        let bounds = new google.maps.LatLngBounds();
        let position = new google.maps.LatLng(Number(latitude), Number(longitude));
        bounds.extend(position);
        map.fitBounds(bounds);
        map.setZoom(8);
    };

    titleForBookChapter = function (bookId, chapter) {
        let book = books(bookId);

        if (book !== undefined) {
            if (chapter > 0) {
                return `${book.tocName} ${chapter}`;
            }
            return book.tocName;
        }
    };

    volumeForId = function(volumeId) {
        if (volumeId !== undefined && volumeId > 0 && volumeId < volumes.length) {
            return volumes[volumeId - 1];
        }
    };

    volumesGridContent = function (volumeId) {
        let gridContent = "";

        volumes.forEach(function (volume) {
            if (volumeId === undefined || volumeId === volume.id) {
               gridContent += htmlDiv({
                    classKey: CLASS_VOLUME,
                    content: htmlAnchor(volume) + htmlElement(TAG_HEADERS, volume.fullName)
               });
               gridContent += booksGrid(volume);
            }
        });
        return gridContent + BOTTOM_PADDING;
    };
    //Public API

    return {
        init: init,
        onHashChanged,
        showLocation
    };
})(); 

//matches = /\((.*),'(.*)', (.*), (.*), (.*), (.*), (.*), (.*), (.*), (.*), '(.*)'\)/.exec("showLocation(108, 'Assyria',36.359410,
//43.152887,33.515336,44.551217,0.000000,0.000000,1202300.000000,0.000000,'>')")

//API Key: AIzaSyDH1PQNMRrEIBgwpfn5beNKnrIm1CO-T2I