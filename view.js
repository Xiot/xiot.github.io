/* eslint-env browser */

const {DateTime} = luxon;

const statsJsonUri = 'https://raw.githubusercontent.com/Xiot/xiot.github.io/master/2020.json';
let stats;

window.onload = load;

function load() {
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
        div({class: 'time title'}, 'star 2')
    ]);
    stats.forEach(s => {
        const winner = fastestScore(s.scores, 2);
        if (!winner) return;
        append(grid, [
            div({class: 'day link', onclick: () => showStatsForDay(s.day)}, s.day.toString()),
            div({class: 'name'}, winner.name),
            div({class: 'time'}, formatTimestamp(s.day, winner.star1)),
            div({class: 'time'}, formatTimestamp(s.day, winner.star2))
        ]);
    });
}

function showStatsForDay(dayIndex) {
    console.log('show', dayIndex);
    const el = document.getElementById('speed-grid');
    while(el.firstChild)
        el.removeChild(el.lastChild);

    document.getElementById('day').innerText = `Day ${dayIndex}`;

    const day = stats[dayIndex - 1];
    const sorted = [...day.scores].sort((l, r) => l.star2 - r.star2);

    sorted.forEach((user, index) => {
        append(el, [
            div({class: 'day'}, (index + 1).toString()),
            div({class: 'name'}, user.name),
            div({class: 'time'}, formatTimestamp(dayIndex, user.star1)),
            div({class: 'time'}, formatTimestamp(dayIndex, user.star2))
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
    return parseInt(
        get(member, ['completion_day_level', day, star, 'get_star_ts']),
        10) * 1000;
}

function formatTimestamp(day, ts) {

    if (!ts) return '';

    const startOfDay = DateTime.local(2020, 12, 1)
        .setZone('America/Toronto', {keepLocalTime: true})
        .plus({days: day - 1});

    const duration = DateTime.fromMillis(ts).diff(startOfDay);
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