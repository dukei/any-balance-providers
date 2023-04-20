const BrowserAPI = (() => {
    const browserApiRelease = 'http://browser.anybalance.ru:4024';
    const browserApiDebug = 'http://localhost:4024';

    /*
    type RuleSource = {
        url?: string
        resType?: string
        not?: boolean
        action: 'abort'|'continue'|'request'
    }

    type Options = {
        provider: string
        debug?: boolean
        userAgent: string,
        singlePage?: boolean,
        headful?: boolean,
        rules?: RuleSource[]
        additionalRequestHeaders: {
            url?: RegExp,
            maxCount?: number,
            headers: {[name: string]: string}
        }[]
    }
    */
    class BrowserAPI {
        constructor(options) {
            this.options = options;
            this.headerMatchCounts = [];
        }

        requestAPI(verb, json) {
            const browserApi = this.options.debug ? browserApiDebug : browserApiRelease;
            const html = json
                ? AnyBalance.requestPost(browserApi + '/' + verb, JSON.stringify(json), {"Referer": this.options.provider + '', "Content-Type": "application/json"})
                : AnyBalance.requestGet(browserApi + '/' + verb + (verb.indexOf('?') >= 0 ? '&' : '?') + '_=' + (+new Date()), {"Referer": this.options.provider + ''});
            const ret = JSON.parse(html);
            if (ret.status !== 'ok') {
                AnyBalance.trace(html);
                throw new AnyBalance.Error(`Ошибка browser api (${verb}): ${ret.message}`);
            }
            return ret;
        }

        //returns {status: 'ok', page: number}
        open(url) {
            const ret = this.requestAPI('base/open', {
                userAgent: this.options.userAgent,
                singlePage: this.options.singlePage,
                headful: this.options.headful,
                url: url,
                rules: this.options.rules
            })
            AnyBalance.trace(`Opening page ${url}: ${ret.page}`);
            return ret;
        }

        waitForLoad(page) {
            let num = 0, json;

            do {
                ++num;
                AnyBalance.sleep(3000);
                json = this.requestAPI('base/status?page=' + page);
                AnyBalance.trace(`Loading status of page ${page}: ${json.loadStatus} (попытка ${num})`);
                if (json.pendingRequests && json.pendingRequests.length > 0) {

                    for (let j = 0; j < json.pendingRequests.length; ++j) {
                        const pr = json.pendingRequests[j];
                        const headers = [];
                        for (let name in pr.headers) {
                            const hv = pr.headers[name];
			    if(hv.trim() === '')
				continue;
                            const values = hv.split('\n');
                            for (let i = 0; i < values.length; ++i)
                                headers.push([name, values[i]]);
                        }

                        let additionalHeaders = {};
                        if(this.options.additionalRequestHeaders){
                            for(let a=0; a<this.options.additionalRequestHeaders.length; ++a){
                                const arh = this.options.additionalRequestHeaders[a];
                                if(!arh.url || arh.url.test(pr.url)){
                                    const headerMatchCounts = this.headerMatchCounts;
                                    if(!arh.maxCount || (headerMatchCounts[a] || 0) < arh.maxCount) {
                                        additionalHeaders = arh.headers || {};
                                        if(arh.maxCount)
                                            headerMatchCounts[a] = (headerMatchCounts[a] || 0) + 1;
                                        break;
                                    }
                                }
                            }
                        }

                        const html = AnyBalance.requestPost(pr.url, pr.body, addHeaders(headers, additionalHeaders), {HTTP_METHOD: pr.method});
                        const params = AnyBalance.getLastResponseParameters();
                        const convertedHeaders = {};
                        let ct;

                        for (let i = 0; i < params.headers.length; ++i) {
                            const h = params.headers[i];
                            const name = h[0].toLowerCase();
                            if (['transfer-encoding', 'content-encoding'].indexOf(name) >= 0)
                                continue; //Возвращаем контент целиком
                            if (name === 'content-length') {
                                //https://stackoverflow.com/questions/5515869/string-length-in-bytes-in-javascript
                                h[1] = '' + unescape(encodeURIComponent(html || '')).length;
                            }
                            if(convertedHeaders[name] === undefined){
                                convertedHeaders[name] = h[1];
                            }else if(Array.isArray(convertedHeaders[name])){
                                convertedHeaders[name].push(h[1]);
                            }else{
                                convertedHeaders[name] += [h[1]];
                            }
                            if (name === 'content-type')
                                ct = h[1];
                        }
                        const prDone = {
                            id: pr.id,
                            page: page,
                            r: {
                                status: AnyBalance.getLastStatusCode(),
                                headers: convertedHeaders,
                                contentType: ct,
                                body: html
                            }
                        }
                        this.requestAPI('base/response', prDone);
                    }
                } else if (json.loadStatus === 'load')
                    break;
            } while (num < 15);

            if (json.loadStatus !== 'load')
                throw new AnyBalance.Error(`Waiting for page ${page} loading timeout!`);
        }

        //returns {status: 'ok', content: string}
        content(page) {
            return this.requestAPI('base/content?page=' + page)
        }

        // returns {status: 'ok', cookies: []}
        cookies(page, urlOrUrls) {
            if (urlOrUrls) {
                if (!Array.isArray(urlOrUrls))
                    urlOrUrls = [urlOrUrls];
            }
            return this.requestAPI('base/cookies', {
                page, urls: urlOrUrls
            });
        }

        close(page) {
            return this.requestAPI('base/close', {page});
        }

        static useCookies(cookies) {
            for (let i = 0; i < cookies.length; ++i) {
                const c = cookies[i];
                AnyBalance.setCookie(c.domain, c.name, c.value, c);
            }
        }
    }

    return BrowserAPI;
})();
