/* eslint-env browser */

const {DateTime, Duration} = luxon;

const statsJsonUriLocal = 'https://raw.githubusercontent.com/Xiot/xiot.github.io/master/2020.json';
const statsJsonUri = 'https://portal.xiot.ca/aoc-2020.json';
const trophySvg = createTrophy();

const startOffset = (9 * 60 + 30) * 60 * 1000;

window.onload = load;

function load() {

    if (window.outerWidth < 800) {
        document.getElementById('root').classList.add('phone')
    }

    fetch(statsJsonUri)
        .catch(ex => fetch(statsJsonUriLocal))
        .then(x => x.json())
        .then(data => initialize(data));
}

function transformData(input) {
    const members = Object.values(input.members)
        .map(transformMemberData);

    populatePositions(members);
    calculateLocalScore(members);

    return members;
}

function populatePositions(members) {

    range(25).forEach(day => {
        const data1 = [...members]
            .sort(membersByStar(day, 1));

        const data2 = [...members]
            .sort(membersByStar(day, 2));

        let pos = 0;
        for(i = 0; i < data1.length; i++) {
            const star = data1[i].days[day].star1;
            if (star)
                star.position = star.gaveUp ? (100 + i) : pos++;
        }
        pos = 0;
        for(i = 0; i < data2.length; i++) {
            const star = data2[i].days[day].star2;
            if (star) {
                star.position = star.gaveUp ? (100 + i) : pos++;
            }
        }
    })
}

function calculateLocalScore(members) {
    const positionScore = star =>
        star == null
            ? 0
            : star.gaveUp
                ? 0
                : members.length - (star?.position ?? 0);

    for (let i = 0; i < members.length; i++) {
        let sum = 0;
        let lastCompleted = -1;
        range(25).forEach(day => {
            const star1 = positionScore(members[i].days[day].star1);
            const star2 = positionScore(members[i].days[day].star2);
            sum += star1 + star2;
            members[i].days[day].score = star1 + star2;
            if (star1 || star2) {
                lastCompleted = day;
            }
        })
        members[i].score = sum;
        members[i].lastAttempted = lastCompleted;
    }
}

function membersByStar(day, star) {
    return (l, r) => {
        const left = starDuration(l.days[day][`star${star}`]);
        const right = starDuration(r.days[day][`star${star}`]);
        return left - right;
    }
}

function membersByTotalScore(l, r) {
    return r.score - l.score;
}

function transformMemberData(member) {
    return {
        name: member.name,
        days: range(25).map(index => {
            return buildMemberDayStats(member, index + 1);
        })
    }
}

function buildMemberDayStats(member, day) {

    const star1Timestamp = getStarTimestamp(member, day, 1);
    const star2Timestamp = getStarTimestamp(member, day, 2);
    const startTime = getDayStartTime(day, star1Timestamp);

    const buildStar = (ts, startTime, star) => {
        if (!ts) { return undefined; }
        const duration = DateTime.fromMillis(ts).diff(startTime).as('milliseconds');
        return {
            timestamp: ts,
            duration,
            gaveUp: didGiveUp(member, day, star)
        }
    }

    return {
        day,
        star1: buildStar(star1Timestamp, startTime, 1),
        star2: buildStar(star2Timestamp, startTime, 2),
    }
}

const colors = [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)'
];

const last = arr => arr[arr.length -1];

let activeChart = undefined;

function minOf(arr, accessor = x => x) {
    return arr.reduce((min, current) => {

        const value = accessor(current);
        if (value === undefined) return min;
        if (!min || min.value > value) {
            return {value, item: current}
        }
        return min;
    }, undefined)?.value;
}

function buildDifferenceChart(el, members) {
    const ctx = el.getContext('2d');

    const isActiveMember = member => member.score > 50;

    const allPoints = members.filter(isActiveMember).map(x => getPoints(x));
    const minOfDay = range(25).map(i => {
        return minOf(allPoints.map(p => p[i]));
    });

    activeChart && activeChart.destroy();
    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: range(25).map(x => String(x + 1)),
            datasets: members.map((m,i) => {
                const data = isActiveMember(m)
                    ? getPoints(m).map((value, index) => {
                        const min = minOfDay[index];
                        if (min === undefined) { return undefined; }
                        return value - min;
                    })
                    : [];
                return {
                    label: m.name,
                    data: data,
                    fill: false,
                    borderColor: colors[i],
                    lineTension: 0
                }
            })
        },
        options: {maintainAspectRatio: false}
    })
}

function buildRankChart(el, members) {
    const ctx = el.getContext('2d');

    const memberPoints = members.map(m => {
        return {
            member: m,
            points: getPoints(m)
        }
    });

    const pointsPerDay = range(25).map(i => {
        return memberPoints.map(x => x.points[i]).sort((l, r) => r - l);
    })
    const positions = memberPoints.map((mp, i) => {
        const member = mp.member;
        const points = memberPoints.find(x => x.member === mp.member).points;

        const d = range(25).map(d => {
            const value = points[d];
            if (value === undefined) {
                return undefined;
            }
            const day = pointsPerDay[d];
            return members.length - day.indexOf(value);

        })

        return {
            member: mp.member,
            positions: d,
        }
    })

    activeChart && activeChart.destroy();
    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: range(25).map(x => String(x + 1)),
            datasets: positions.map((m,i) => {
                return {
                    label: m.member.name,
                    data: m.positions,
                    fill: false,
                    borderColor: colors[i],
                    // cubicInterpolationMode: 'monotone',
                    lineTension: 0,
                    spanGaps: true
                }
            })
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                yAxes: [{display: false}]
            }
        }
    })
}

function buildPointChart(el, members) {
    const ctx = el.getContext('2d');

    activeChart && activeChart.destroy();
    activeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: range(25).map(x => String(x + 1)),
            datasets: members.map((m,i) => {
                const data = getPoints(m);
                return {
                    label: m.name,
                    data,
                    fill: false,
                    borderColor: colors[i],
                    // cubicInterpolationMode: 'monotone',
                    lineTension: 0,
                    spanGaps: true
                }
            })
        },
        options: {maintainAspectRatio: false}
    })
}

const getPoints = member => member.days.reduce((acc, day) => {
    if (acc === undefined) {
        return [day.score];
    } else {
        const previousScore = last(acc.filter(Boolean));
        const score = day.score
            ? day.score
            : day.day <= member.lastAttempted
                ? 0
                : undefined;
        return [...acc, (score != null && previousScore) ? previousScore + score : undefined];
    }
}, undefined)

function initialize(data) {

    const members = transformData(data);
    document.getElementById('medals').appendChild(
        buildMedalGrid(members)
    )

    document.getElementById("show-point-chart").onclick = function() {
        buildPointChart(document.getElementById('rank-chart'), members);
    }
    document.getElementById("show-rank-chart").onclick = function() {
        buildRankChart(document.getElementById('rank-chart'), members);
    }
    document.getElementById("show-difference-chart").onclick = function() {
        buildDifferenceChart(document.getElementById('rank-chart'), members);
    }

    const chartEl = document.getElementById('rank-chart')
    buildPointChart(chartEl, members);

    const grid = document.getElementById('ranking-grid');
    const days = dataByDay(members);

    append(grid, [
        div({class: 'day title'}, ''),
        div({class: 'name title'}, 'name'),
        div({class: 'time title'}, 'star 1'),
        div({class: 'trophy title empty'}),
        div({class: 'time title'}, 'star 2'),
        div({class: 'trophy title empty'}),
    ]);
    days.forEach(day => {
        const winner = fastestScore(day.scores, 2);
        if (!winner) return;
        append(grid, [
            div({class: 'day link value', onclick: () => showStatsForDay(day)}, (day.day + 1).toString()),
            div({class: 'name value'}, winner.name),
            div({class: 'time value'}, formatStarTime(winner.star1)),
            starTrophy(winner.star1),
            div({class: 'time value'}, formatStarTime(winner.star2)),
            starTrophy(winner.star2),
        ]);
    });
}

function getPosition(day, starIndex, star) {
    if (!star) { return -1;}
    if (star.gaveUp) { return -2; }

    const sorted = [...day.scores]
        .map(member => {
            return starDuration(member[`star${starIndex}`])
        })
    .sort((l, r) => l - r);

    return sorted.indexOf(star.duration);
}

function starDuration(star) {
    if (!star) return Number.MAX_SAFE_INTEGER;
    if (star.gaveUp) return Number.MAX_SAFE_INTEGER / 2 + star.duration;
    return star.duration;
}

function showStatsForDay(day) {

    const el = document.getElementById('speed-grid');
    while(el.firstChild)
        el.removeChild(el.lastChild);

    document.getElementById('day').innerText = `Day ${day.day + 1}`;

    const sorted = [...day.scores].sort((l, r) => {

        const l1 = starDuration(l.star1);
        const l2 = starDuration(l.star2);
        const r1 = starDuration(r.star1);
        const r2 = starDuration(r.star2);

        return r2 === l2
            ? l1 - r1
            : l2 - r2;
    });

    sorted.forEach((user, index) => {
        append(el, [
            div({class: 'day value'}, (index + 1).toString()),
            div({class: 'name value'}, user.name),
            div({class: 'time value'}, formatStarTime(user.star1)),
            starTrophy(user.star1),
            div({class: 'time value'}, formatStarTime(user.star2)),
            starTrophy(user.star2)
        ]);
    });
}

function fastestScore(scores, star) {
    if (scores.length === 0) {
        return null;
    }
    const key = `star${star}`;
    return scores.reduce((fastest, score) => {
        if (!fastest[key] && score[key]) {return score; }
        if (!score[key]) { return fastest; }
        if (score[key] && fastest[key].duration > score[key].duration) {
            return score;
        }
        return fastest;
    });
}

function buildMedalGrid(members) {
    const el = div({class: 'medal-grid'});
    members = [...members].sort(membersByTotalScore);

    const days = dataByDay(members);

    append(el, [
        div({style: 'grid-column: start;'}),
        trophy(0, {class: 'header'}),
        trophy(1, {class: 'header'}),
        trophy(2, {class: 'header'}),
        div({
            class: 'name header',
            style: 'grid-column: name;',
        }, text('Name')),

        ...days
            .map(day => div({
                class: 'day header',
                style: `grid-column: ${day.day+6}`,
                onclick: () => showStatsForDay(day)
            }, text(day.day+1))),
        div({class: 'header-border'})
    ]);

    for(let member of members) {
        const row = range(25).map(i => {
            const star1 = member.days[i].star1;
            const star2 = member.days[i].star2;
            const pos1 = star1?.position ?? -1;
            const pos2 = star2?.position ?? -1;

            const star = starTrophy(star2);
            const strokeColor = ['transparent', 'gold', 'silver', '#cd7f32'][pos1 + 1]
            star.style['background-color'] = strokeColor;
            star.classList.add('day');
            star.style['grid-column'] = `${i + 6}`
            if (pos2 >= 0) {
                star.style.position = 'relative';
                if (!star2?.gaveUp) {
                    star.appendChild(
                        div({class: 'position'}, text(pos2+1))
                    )
                }
            }
            return star;
        })
        el.appendChild(
            div({class: 'score', style: 'grid-column: 1'}, text(member.score))
        )

        const medals = member.days.reduce((acc, day) => {
            acc.gold += medalsForDay(day, 0);
            acc.silver += medalsForDay(day, 1);
            acc.bronze += medalsForDay(day, 2);
            return acc;
        }, {gold: 0, silver: 0, bronze: 0})

        append(el, [
            div({class: 'medal-count gold'}, text(medals.gold)),
            div({class: 'medal-count silver'}, text(medals.silver)),
            div({class: 'medal-count bronze'}, text(medals.bronze))
        ])

        el.appendChild(
            div({class: 'name', style: 'grid-column: name'}, text(member.name))
        )

        for(let r of row) {
            el.appendChild(r);
        }
        el.appendChild(div({}))
    }
    return el;
}

function medalsForDay(day, position) {
    return (isPosition(day.star1, position) ? 1 : 0) + (isPosition(day.star2, position) ? 1 : 0)
}
function isPosition(star, target) {
    return star?.position === target;
}

function dataByDay(members) {
    return range(25)
        .map(day => ({
            day,
            scores: members.map(m => ({
                name: m.name,
                ...m.days[day]
            })).filter(m => m.star1 || m.star2)
        })).filter(d => d.scores.length > 0);
}

function range(to) {
    return Array.from(new Array(to), (x, i) => i)
}

function getStarTimestamp(member, day, star) {
    const text = get(member, ['completion_day_level', day, star, 'get_star_ts']);
    return text ? parseInt(text, 10) * 1000 : undefined;
}

function getDayStartTime(day, ts) {
    if (!ts) return undefined;

    const startOfDay = DateTime.local(2020, 12, 1)
        .setZone('America/Toronto', {keepLocalTime: true})
        .plus({days: day - 1});

    const secondStart = startOfDay.plus({hours: 9, minutes: 30});
    const solveTime = DateTime.fromMillis(ts);
    return ts > secondStart
        ? secondStart
        : startOfDay;
}

function formatStarTime(star) {
    if (!star || !star.duration) return '';
    return Duration.fromMillis(star.duration).toFormat('hh:mm:ss');
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
    return document.createTextNode(String(value));
}

function node(tag, props, children) {
    const el = document.createElement(tag);
    props && Object.entries(props).forEach(([key, value]) => {
        if (key.startsWith('on')) {
            el[key] = value;
        } else if (key === 'style' && typeof value !== 'string') {
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

function div(props, children) {
    return node('div', props, children);
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

function starTrophy(star, props) {
    if (!star) return div({class: 'trophy'});
    if (star.gaveUp) return div({class: 'trophy dnf'}, text('DNF'));
    return trophy(star.position, props);
}

function trophy(position, props) {
    if (position === -1) return div({class: 'trophy'});
    if (position === -2) return div({class: 'trophy'}, text('DNF'));
    if (position < 0 || position > 2) return div({class: 'trophy'});
    const classes = ['gold', 'silver', 'bronze'];
    const className = classes[position];

    const {class: additionalClasses, ...otherProps} = props ?? {};

    const el = node('i', {
        class: `trophy ${className} ${additionalClasses ?? ''}`,
        ...otherProps
    }, trophySvg.cloneNode(true))
    return el;
}

function didGiveUp(member, day, star) {
    return !!get(disqualified, [member.name, String(day), String(star)])
}

const disqualified = {
    "Chris Thomas": {
        "13" : {
            "2": true
        }
    },
    "S. Sepehr": {
        "13": {
            "2": true
        }
    }
  }