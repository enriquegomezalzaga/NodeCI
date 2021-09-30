const Page = require('./helpers/page');

let page;

beforeEach(async() => {
    page = await Page.build();
    await page.goto('http://localhost:3000');
});

afterEach(async() => {
    await page.browser.close();
});

describe('When logged in', async() => {
    beforeEach(async() => {
        await page.login();
        await page.click('a[href="/blogs/new"]');
    });

    test('Can see blog create form', async() => {
        const text = await page.getContentsOf('form .title label');

        expect(text).toEqual('Blog Title');
    });

    describe('And using valid input', async() => {
        beforeEach(async() => {
            await page.type('input[name="title"]', 'Auto blog title');
            await page.type('input[name="content"]', 'Auto content');
            await page.click('form button[type="submit"]');
        });

        test('Submitting takes user to review screen', async() => {
            const text = await page.getContentsOf('h5');

            expect(text).toEqual('Please confirm your entries');
        });

        test('Submitting then saving takes user to index page', async() => {
            await page.click('button.green');
            await page.waitFor('.card');

            const title = await page.getContentsOf('.card .card-title');
            const content = await page.getContentsOf('.card p');

            expect(title).toEqual('Auto blog title');
            expect(content).toEqual('Auto content');
        });
    });

    describe('And using invalid input', async() => {
        beforeEach(async() => {
            await page.click('form button[type="submit"]');
        });

        test('Form shows error message', async() => {
            const titleError = await page.getContentsOf('.title .red-text');
            const contentError = await page.getContentsOf('.content .red-text');

            expect(titleError).toEqual('You must provide a value');
            expect(contentError).toEqual('You must provide a value');
        });
    });
});

describe('When not logged in', async() => {
    const actions = [{
            method: 'get',
            path: '/api/blogs'
        },
        {
            method: 'post',
            path: '/api/blogs',
            data: { title: 'Desde Fetch', content: 'lalala' }
        }
    ];

    test('Blog related actions are prohibited', async() => {
        const results = await page.execRequests(actions);

        for (let result of results) {
            expect(result).toEqual({ error: 'You must log in!' });
        }
    });
});