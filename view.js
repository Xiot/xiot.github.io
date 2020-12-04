/* eslint-env browser */

const {DateTime} = luxon;

const statsJsonUri = 'https://raw.githubusercontent.com/Xiot/xiot.github.io/master/2020.json';
const trophySvg = createTrophy();

const startOffset = (9 * 60 + 30) * 60 * 1000;

let stats;

window.onload = load;

function load() {

    if (window.outerWidth < 800) {
        document.getElementById('root').classList.add('phone')
    }

    fetch(statsJsonUri)
        .then(x => x.json())
        .then(data => initialize(data));
}

function initialize(data) {
    const grid = document.getElementById('ranking-grid');
    stats = dataByDay(data);

    append(grid, [
        div({class: 'day title'}, 'day'),
        div({class: 'name title'}, 'name'),
        div({class: 'time title'}, 'star 1'),
        div({class: 'trophy title empty'}),
        div({class: 'time title'}, 'star 2'),
        div({class: 'trophy title empty'}),
    ]);
    stats.forEach(s => {
        const winner = fastestScore(s.scores, 2);
        if (!winner) return;
        append(grid, [
            div({class: 'day link value', onclick: () => showStatsForDay(s.day)}, s.day.toString()),
            div({class: 'name value'}, winner.name),
            div({class: 'time value'}, formatTimestamp(s.day, winner.star1)),
            trophy(getPosition(s, 1, winner.star1)),
            div({class: 'time value'}, formatTimestamp(s.day, winner.star2)),
            trophy(getPosition(s, 2, winner.star2)),
        ]);
    });
}

function getPosition(day, star, ts) {
    if (!ts) { return -1;}

    const sorted = [...day.scores]
        .map(member => {
            return member[`star${star}`];
        })
    .sort((l, r) => l - r);

    return sorted.indexOf(ts);
}

function showStatsForDay(dayIndex) {

    const el = document.getElementById('speed-grid');
    while(el.firstChild)
        el.removeChild(el.lastChild);

    document.getElementById('day').innerText = `Day ${dayIndex}`;

    const day = stats[dayIndex - 1];
    const sorted = [...day.scores].sort((l, r) => {

        const {
            star1: l1 = Number.MAX_SAFE_INTEGER,
            star2: l2 = Number.MAX_SAFE_INTEGER
        } = l;
        const {
            star1: r1 = Number.MAX_SAFE_INTEGER,
            star2: r2 = Number.MAX_SAFE_INTEGER
        } = r;

        return r2 === l2
            ? l1 - r1
            : l2 - r2;
    });

    sorted.forEach((user, index) => {
        append(el, [
            div({class: 'day value'}, (index + 1).toString()),
            div({class: 'name value'}, user.name),
            div({class: 'time value'}, formatTimestamp(dayIndex, user.star1)),
            trophy(getPosition(day, 1, user.star1)),
            div({class: 'time value'}, formatTimestamp(dayIndex, user.star2)),
            trophy(getPosition(day, 2, user.star2)),
        ]);
    });
}

function fastestScore(scores, star) {
    if (scores.length === 0) {
        return null;
    }
    const key = `star${star}`;
    return scores.reduce((fastest, score) => {
        if (fastest[key] > score[key]) {
            return score;
        }
        return fastest;
    });
}

function dataByDay(data) {
    const members = Object.values(data.members);
    let byday = [];
    for(let i = 0; i < 25; i++) {

        const scores = members.map(m => ({
            name: m.name,
            star1: getStarTime(m, i + 1, 1),
            star2: getStarTime(m, i + 1, 2)
        })).filter(x => x.star1 || x.star2);

        byday[i] = {
            day: i + 1,
            scores,
        };
    }
    return byday;
}

function getStarTime(member, day, star) {
    const text = get(member, ['completion_day_level', day, star, 'get_star_ts']);
    return text ? parseInt(text, 10) * 1000 : undefined;
}

function formatTimestamp(day, ts) {

    if (!ts) return '';

    const startOfDay = DateTime.local(2020, 12, 1)
        .setZone('America/Toronto', {keepLocalTime: true})
        .plus({days: day - 1});

    let duration = DateTime.fromMillis(ts).diff(startOfDay);

    if (duration.as('milliseconds') > startOffset)
        duration = duration.plus({milliseconds: -startOffset});

    return duration.toFormat('hh:mm:ss');
}

function get(obj, keys) {
    for(let key of keys) {
        obj = obj[key];
        if (obj == null) {
            return undefined;
        }
    }
    return obj;
}

function text(value) {
    return document.createTextNode(value);
}

function div(props, children) {
    const el = document.createElement('div');
    props && Object.entries(props).forEach(([key, value]) => {
        if (key.startsWith('on')) {
            el[key] = value;
        } else {
            el.setAttribute(key, value);
        }
    });
    append(el, children);
    return el;
}

function append(target, children) {
    if (!children) return;
    if (typeof children === 'string')
        target.appendChild(text(children));
    else if (Array.isArray(children))
        children.forEach(c => target.appendChild(c));
    else
        target.appendChild(children);
}

function createTrophy() {
    const container = document.createElement('div');
    const el = document.createElement('svg');
    container.appendChild(el);
    // container.innerHTML = `
    //     <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trophy" class="svg-inline--fa fa-trophy fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
    //         <path fill="currentColor" d="M552 64H448V24c0-13.3-10.7-24-24-24H152c-13.3 0-24 10.7-24 24v40H24C10.7 64 0 74.7 0 88v56c0 35.7 22.5 72.4 61.9 100.7 31.5 22.7 69.8 37.1 110 41.7C203.3 338.5 240 360 240 360v72h-48c-35.3 0-64 20.7-64 56v12c0 6.6 5.4 12 12 12h296c6.6 0 12-5.4 12-12v-12c0-35.3-28.7-56-64-56h-48v-72s36.7-21.5 68.1-73.6c40.3-4.6 78.6-19 110-41.7 39.3-28.3 61.9-65 61.9-100.7V88c0-13.3-10.7-24-24-24zM99.3 192.8C74.9 175.2 64 155.6 64 144v-16h64.2c1 32.6 5.8 61.2 12.8 86.2-15.1-5.2-29.2-12.4-41.7-21.4zM512 144c0 16.1-17.7 36.1-35.3 48.8-12.5 9-26.7 16.2-41.8 21.4 7-25 11.8-53.6 12.8-86.2H512v16z"></path>
    //     </svg>
    // `;
    container.innerHTML = `
    <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="star" class="svg-inline--fa fa-star fa-w-18" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path></svg>
    `
    return container.firstElementChild;
}

function removeChildren(el) {
    while(el.firstChild)
        el.removeChild(el.lastChild);
}

function trophy(position) {
    if (position < 0 || position > 2) return document.createElement('div');
    const classes = ['gold', 'silver', 'bronze'];
    const el = document.createElement('i');
    const className = classes[position];
    el.classList.add('trophy', className);
    el.appendChild(trophySvg.cloneNode(true))
    return el;
}

function refreshTrophies() {
    const els = document.querySelectorAll('i.trophy');
    for(const el of els) {
        removeChildren(el);
        el.appendChild(trophySvg.cloneNode(true));
    }
}