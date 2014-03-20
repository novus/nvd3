Q = require "q"
should = require "should"
webdriver = require "selenium-webdriver"
By = webdriver.By
glob = require 'glob'

driver = new webdriver.Builder().
    usingServer(process.env.SELENIUM_HUB).
    withCapabilities(webdriver.Capabilities['firefox']()).build()

driver.manage().timeouts().setScriptTimeout(10000)

describe "NVD3 Tests", ->
    this.timeout 1000 * 60 * 60 # This will take a while...

    # Mocha runs this from the root of the project
    files = glob.sync('test/*.html')
    it "Loads and Runs", (done)->
        flows = files.map (file)->
            url = "http://localhost:8808/test/#{file.match(/.*\/([^\/]+)/)[1]}"
            webdriver.promise.createFlow ->
                driver.get(url).then ->
                    console.log "Finished #{url}"
                    # TODO actually test the charts...

        passed = ->
            console.log "Finished all pages."
            driver.quit().then(done)

        failed = (err)->
            console.error "Had a problem", err
            driver.quit().then(->done(err))

        webdriver.promise.fullyResolved(flows).then passed, failed
