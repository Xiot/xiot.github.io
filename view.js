/* eslint-env browser */

const {DateTime, Duration} = luxon;

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

    console.log(stats);

    document.getElementById('medals').appendChild(
        buildMedalGrid(data)
    )

    append(grid, [
        div({class: 'day title'}, ''),
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
            div({class: 'time value'}, formatStarTime(winner.star1)),
            trophy(getPosition(s, 1, winner.star1)),
            div({class: 'time value'}, formatStarTime(winner.star2)),
            trophy(getPosition(s, 2, winner.star2)),
        ]);
    });
}

function getPosition(day, star, ts) {
    if (!ts) { return -1;}

    const sorted = [...day.scores]
        .map(member => {
            if (!member[`star${star}`]) return Number.MAX_SAFE_INTEGER;
            return member[`star${star}`].duration;
        })
    .sort((l, r) => l - r);

    return sorted.indexOf(ts.duration);
}

function showStatsForDay(dayIndex) {

    const el = document.getElementById('speed-grid');
    while(el.firstChild)
        el.removeChild(el.lastChild);

    document.getElementById('day').innerText = `Day ${dayIndex}`;

    const day = stats[dayIndex - 1];
    const sorted = [...day.scores].sort((l, r) => {

        const {
            star1: l1 = {duration: Number.MAX_SAFE_INTEGER},
            star2: l2 = {duration: Number.MAX_SAFE_INTEGER}
        } = l;
        const {
            star1: r1 = {duration: Number.MAX_SAFE_INTEGER},
            star2: r2 = {duration: Number.MAX_SAFE_INTEGER}
        } = r;

        return r2.duration === l2.duration
            ? l1.duration - r1.duration
            : l2.duration - r2.duration;
    });

    sorted.forEach((user, index) => {
        append(el, [
            div({class: 'day value'}, (index + 1).toString()),
            div({class: 'name value'}, user.name),
            div({class: 'time value'}, formatStarTime(user.star1)),
            trophy(getPosition(day, 1, user.star1)),
            div({class: 'time value'}, formatStarTime(user.star2)),
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
        if (score[key] && fastest[key].duration > score[key].duration) {
            return score;
        }
        return fastest;
    });
}

function buildMedalGrid(scores) {
    const el = div({class: 'medal-grid'});
    const members = Object.values(scores.members);

    for(let member of members) {
        const row = range(25).map(i => {
            const star1 = getStarTime(member, i+1, 1);
            const star2 = getStarTime(member, i+1, 2);
            const pos1 = getPosition(stats[i], 1, star1)
            const pos2 = getPosition(stats[i], 2, star2)

            const star = trophy(pos2);
            const strokeColor = ['transparent', 'gold', 'silver', '#cd7f32'][pos1 + 1]
            // star.style['border'] = `2px solid ${strokeColor}`
            star.style['background-color'] = strokeColor;

            star.style['grid-column'] = `${i + 2}`
            if (pos2 >= 0) {
                star.style.position = 'relative';
                star.appendChild(
                    div({style: {
                        display: 'flex',
                        'justify-content': 'center',
                        'align-items': 'center',
                        'font-weight': 'bold',
                        position: 'absolute',
                        left: 0, right: 0, top: 0, bottom: 0,
                        color: 'black',
                        'padding-top': '2px'
                        // width: '100%',
                        // height: '100%'
                    }}, text(pos2+1))
                )
                // star.appendChild(text(pos2+1));
                // star.style.display = 'flex';
                // star.style['justify-content'] = 'center';
                // star.style['align-items'] = 'center';
                // star.style['font-weight'] = 'bold';
            }
            return star;
        })
        el.appendChild(
            div({class: 'name', 'grid-column': '1'}, text(member.name))
        )
        for(let r of row) {
            el.appendChild(r);
        }
        el.appendChild(div({}))
    }
    return el;
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

function range(to) {
    return Array.from(new Array(to), (x, i) => i)
}

function getStarTime(member, day, star) {
    const text = get(member, ['completion_day_level', day, star, 'get_star_ts']);
    const timestamp = text ? parseInt(text, 10) * 1000 : undefined;
    if (!timestamp) return undefined;
    return {
        timestamp,
        duration: duration(day, timestamp)
    }
}

function duration(day, ts) {
    if (!ts) return undefined;

    const startOfDay = DateTime.local(2020, 12, 1)
        .setZone('America/Toronto', {keepLocalTime: true})
        .plus({days: day - 1});

    let duration = DateTime.fromMillis(ts).diff(startOfDay);

    const newStartTime = duration.as('milliseconds') > startOffset;
    if (newStartTime)
        duration = duration.plus({milliseconds: -startOffset});

    return duration.as('milliseconds');
}

function formatStarTime(star) {
    if (!star || !star.duration) return '';
    return Duration.fromMillis(star.duration).toFormat('hh:mm:ss');
}

function formatTimestamp(day, ts) {

    if (!ts) return '';

    const startOfDay = DateTime.local(2020, 12, 1)
        .setZone('America/Toronto', {keepLocalTime: true})
        .plus({days: day - 1});

    let duration = DateTime.fromMillis(ts).diff(startOfDay);

    const newStartTime = duration.as('milliseconds') > startOffset;
    if (newStartTime)
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
        } else if (key === 'style') {
            Object.entries(value).forEach(([key, value]) =>
                el.style[key] = value
            )
        } else {
            el.setAttribute(key, value);
        }
    });
    children && append(el, children);
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
    if (position < 0 || position > 2) return div({class: 'trophy'}) //document.createElement('div');
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