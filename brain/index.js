const requireConf = requirejs.config({
  context: "index.html",
  paths: {

  }
})

if('serviceWorker' in navigator) {
  navigator.serviceWorker
           .register('sw.js')
           .then(function() { console.log("Service Worker Registered"); });
}

requireConf([
  "https://unpkg.com/pouchdb@7.0.0/dist/pouchdb.min.js",
  "https://unpkg.com/js-yaml@3.12.0/dist/js-yaml.min.js",
], function (PouchDB, yaml) {
  const db = new PouchDB('wiki');

  (async () => {
    populateAuth()
    await sync()

    const { rows } = await db.allDocs({
      include_docs: true,
    })
    const docs = rows.flatMap(r => r.doc)

    var div = document.createElement("div");
    div.innerHTML = render(docs)
    document.body.appendChild(div);
  })()

  async function sync() {
    const str = localStorage['couchdb_target']
    if (!str) {
      return
    }

    const config = JSON.parse(str)
    const remoteDb = new PouchDB(config.url, { auth: config.auth })

    await db.sync(remoteDb, {
      live: false, retry: false
    }).on('denied', function (err) {
      console.log('denied', err)
    }).on('error', function (err) {
      console.log('error', err)
    });
  }

  function populateAuth() {
    if (localStorage['couchdb_target']) {
      return
    }
    const result = prompt("replication target")
    if (!result) {
      alert("Unable to authenticate")
      return
    }

    try {
      JSON.parse(result)
      localStorage['couchdb_target'] = result
    } catch(err) {
      console.log(err)
      iphoneDebug(err)
      alert("Unable to authenticate")
      return
    }
  }

  function iphoneDebug(err) {
    var div = document.createElement("pre");
    div.innerHTML = JSON.stringify({msg: err.message, err: err}, null, ' ')
    document.body.appendChild(div);
  }

  function render(docs) {
    return `
      <pre><code><a href="#focus-list">focus-list</a></code></pre>
      ${list(docs).join("\n")}
    `
  }

  function list(docs) {
    return docs.flatMap(doc => {
      if (!doc.what) {
        doc.what = `list_of: ${doc.list_of}`
      }
      if (doc.related) {
        doc.related = stringToList(doc.related).flatMap(r => `#A#${r}#A#`)
      }

      const coded = sortedYaml(doc).replace(/#A#([^#]+)#A#/g, '<a href="#$1">$1</a>')

      return `
        ${spanIfNeeded(doc)}
        <h3 id="${doc._id}">${doc.what}</h3>
        <pre>${coded}</pre>
      `
    })
  }

  function spanIfNeeded(doc) {
    return (doc.what !== doc._id) ? `<span id="${doc.what}"></span>` : ""
  }

  function getWidth() {
    return Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth,
      document.documentElement.clientWidth
    );
  }

  function getHeight() {
    return Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.documentElement.clientHeight
    );
  }

  function stringToList(value) {
    if (typeof value === "string") {
      return [ value ];
    }

    return value || [];
  }

  let widthMem
  const maxPreWidth = 100;
  function getPreWidthMem() {
    if (!widthMem) {
      widthMem = (getWidth() - 32)/8
      //widthMem = Math.min(widthMem, maxPreWidth)
    }

    return widthMem
  }


  function sortedYaml(input) {
    return yaml.safeDump(input, {
      lineWidth: getPreWidthMem(),
      sortKeys: function (a, b) {
        const fieldOrder = [
          '_id',
          '_rev',
          'what',
          'list_of',
          'aka',
          'text',
          'search',
          'about',
          'code',
          'quote',
          'src',
          'question',
          'answer',
          'more',
          'date',
          'tags',
          'related',
          'links',
          'books',
          'todo',
          'topics',
          'list',
          'thoughts',
          'title',
          'book',
          'chapter',
          'link'
        ]
        for (var i=0;i<fieldOrder.length;i++) {
          if (a == fieldOrder[i]) {
            return -1
          }
          if (b == fieldOrder[i]) {
            return 1
          }
        }
        return a < b ? 1 : a > b ? -1 : 0;
      }
    })
  }
})
