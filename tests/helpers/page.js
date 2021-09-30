const puppeteer = require('puppeteer');
const sessionFactory = require('../factories/sessionFactory');
const userFactory = require('../factories/userFactory');

class CustomPage {
    constructor(browser) {
        this.browser = browser;
    }

    static async build() {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox']
        });

        const page = await browser.newPage();
        const customPage = new CustomPage(browser);

        return new Proxy(customPage, {
            get: function(target, property) {
                return customPage[property] || page[property];
            }
        });
    }

    async login(userProps) {
        const user = await userFactory(userProps);
        const { session, sig } = sessionFactory(user);

        await this.setCookie({ name: 'session', value: session });
        await this.setCookie({ name: 'session.sig', value: sig });

        // await this.reload();
        await this.goto('http://localhost:3000/blogs');
        await this.waitFor('a[href="/auth/logout"]');
    }

    getContentsOf(selector) {
        return this.$eval(selector, el => el.innerHTML);
    }

    get(path) {
        // return this.request('GET', path);

        return this.evaluate((_path) => {
            return fetch('/api/blogs', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(res => res.json());
        }, path);
    }

    post(path, data) {
        // return this.request('POST', path, data);

        return this.evaluate((_path, _data) => {
            return fetch(_path, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(_data)
            }).then(res => res.json());
        }, path, data);
    }

    request(method, path, data) {
        return this.evaluate((_method, _path, _data) => {
            return fetch(_path, {
                method: _method,
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: _data ? JSON.stringify(_data) : null
            }).then(res => res.json());
        }, method, path, data);
    }

    execRequests(actions) {
        return Promise.all(
            actions.map(({ method, path, data }) => this[method](path, data))
        );
    }
}

module.exports = CustomPage;