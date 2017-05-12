import fetch, { Headers } from 'node-fetch';

Object.assign(global, {
    Headers,
    fetch
});
