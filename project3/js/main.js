/* Clamped
   Behaviour for the seven pages: the simulated search, the issue list filter,
   and the issue workflow. One file, linked everywhere, jQuery only. */


/* Sample data */
/* No backend yet, so the issues the search can return live here. Each one
   matches a row that already exists on list.html. */
var ISSUES = [
    {
        key: 'CLM-148', title: 'Checkout returns 500 when a saved card has no billing address',
        project: 'checkout-service', severity: 'CRITICAL', status: 'REPORTED', due: '9/28/2026'
    },
    {
        key: 'CLM-139', title: 'NullPointerException in PaymentService.processPayment',
        project: 'checkout-service', severity: 'CRITICAL', status: 'PATCHED', due: '9/24/2026'
    },
    {
        key: 'CLM-137', title: 'Session cookie is not cleared after logout',
        project: 'clamped-web', severity: 'HIGH', status: 'PATCHED', due: '9/26/2026'
    },
    {
        key: 'CLM-134', title: 'Refresh token retry storm when the access token expires',
        project: 'api-gateway', severity: 'HIGH', status: 'IN_PROGRESS', due: '10/1/2026'
    }
];

/* The phrase the search recognises. Every search box suggests it. */
var KEYPHRASE = 'payment';

/* Listed so one call clears whichever status a chip is currently wearing. */
var STATUS_CLASSES = 'status-reported status-in-progress status-patched ' +
                     'status-under-review status-verified';

/* CRITICAL becomes severity-critical, IN_PROGRESS becomes status-in-progress. */
function chipClass(prefix, code) {
    return prefix + '-' + code.toLowerCase().replace('_', '-');
}


/* Simulated search */
/* The top bar form is a GET pointing at search.html, so the phrase arrives in
   the query string. A switch decides whether it is recognised. */

/* One results row. Built with jQuery so the issue text goes in as text and
   cannot be mistaken for markup. */
function buildResultRow(issue) {
    var row = $('<tr>');

    row.append($('<td>').addClass('ticket-key').text(issue.key));

    var titleLink = $('<a>').addClass('issue-table__title')
                            .attr('href', 'detail.html')
                            .text(issue.title);
    row.append($('<td>').append(titleLink));

    row.append($('<td>').text(issue.project));

    row.append($('<td>').append(
        $('<span>').addClass('chip ' + chipClass('severity', issue.severity))
                   .text(issue.severity)
    ));

    row.append($('<td>').append(
        $('<span>').addClass('chip ' + chipClass('status', issue.status))
                   .text(issue.status.replace('_', ' '))
    ));

    row.append($('<td>').text(issue.due));

    return row;
}

/* The whole results table, same shape as the one on the issue list. */
function buildResultsTable(matches) {
    var table = $('<table>').addClass('issue-table');
    var headings = ['Key', 'Issue', 'Project', 'Severity', 'Status', 'Due'];
    var headRow = $('<tr>');
    var body = $('<tbody>');
    var i;

    table.append($('<caption>').addClass('visually-hidden').text(
        'Issues matching your search, with key, title, project, severity, status and due date.'
    ));

    for (i = 0; i < headings.length; i++) {
        headRow.append($('<th>').attr('scope', 'col').text(headings[i]));
    }
    table.append($('<thead>').append(headRow));

    for (i = 0; i < matches.length; i++) {
        body.append(buildResultRow(matches[i]));
    }
    table.append(body);

    return table;
}

/* Every issue belonging to one project. */
function issuesInProject(projectName) {
    var found = [];
    var i;
    for (i = 0; i < ISSUES.length; i++) {
        if (ISSUES[i].project === projectName) {
            found.push(ISSUES[i]);
        }
    }
    return found;
}

function initSearch() {
    var output = $('#search-output');
    var summary = $('#search-summary');
    var query;
    var matches;
    var message;

    if (output.length === 0) {
        return;                       // not the search page
    }

    // Read q= from the address bar and tidy it, so "  Payment " still matches.
    // A GET form sends a space as +, and this turns it back.
    query = new URLSearchParams(window.location.search).get('q');
    if (!query) {
        query = '';
    }
    query = query.trim().toLowerCase();

    // Arriving with no phrase is not a failed search, so it gets the prompt.
    if (query === '') {
        summary.text('Type a phrase in the search box above to look through your issues.');
        return;
    }

    // Anything not listed falls through and gets the friendly message.
    switch (query) {
    case KEYPHRASE:
    case 'checkout':
        matches = issuesInProject('checkout-service');
        break;
    case 'token':
        matches = issuesInProject('api-gateway');
        break;
    default:
        matches = [];
    }

    if (matches.length > 0) {
        summary.text('Found ' + matches.length + ' issue' +
                     (matches.length === 1 ? '' : 's') + ' matching your search.');
        output.html('').append(buildResultsTable(matches));
    } else {
        // Name the problem and say what to try instead, the same way the
        // report form does. From the "say exactly what needs fixing" feedback.
        summary.text('No issues matched your search.');

        message = $('<p>').html(
            '<strong>No results found.</strong> Nothing in your projects matches that ' +
            'phrase. Search is simulated in this prototype, so try the phrase "' +
            KEYPHRASE + '" to see what a result set looks like, or '
        );
        message.append($('<a>').attr('href', 'list.html').text('browse all issues'));
        message.append(' instead.');

        output.html('').append($('<div>').addClass('alert').append(message));
    }
}


/* Issue list filter */
/* Interaction one, on the change event. This is the DOM traversal one: from
   the filter bar across to the table, then down into each row's cells.
   Makes the filter chips real, from the "filters should stay highlighted"
   feedback. */

/* What each chip says, keyed by the select it belongs to. */
var FILTER_LABELS = {
    'filter-project': 'Project',
    'filter-role': 'My role',
    'filter-status': 'Status',
    'filter-severity': 'Severity'
};

/* Which column each filter reads, counting from zero. Role is missing because
   the owner cell reads "You patched it", so rows carry data-role instead. */
var FILTER_COLUMNS = {
    'filter-project': 2,
    'filter-severity': 3,
    'filter-status': 4
};

/* The options read "Medium and above", so severity is a floor, not a match. */
var SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/* Traverse from the filter bar to the rows of the table beside it. */
function issueRows() {
    return $('#filter-bar').siblings('#issue-table').children('tbody').children('tr');
}

/* Does this row survive every filter that is switched on? */
function rowMatches(row, text) {
    var keep = true;

    $('#filter-bar').find('select').each(function () {
        var wanted = $(this).val();
        var cell;

        if (wanted === '') {
            return;                   // "All ..." - this filter is off
        }

        if (this.id === 'filter-role') {
            if (row.attr('data-role') !== wanted) {
                keep = false;
            }
            return;
        }

        // Into the row: its cells, then the one this filter reads. Both sides
        // are upper-cased since the values mix codes and names.
        cell = row.children('td').eq(FILTER_COLUMNS[this.id]).text().trim().toUpperCase();

        if (this.id === 'filter-severity') {
            if (SEVERITY_RANK[cell] < SEVERITY_RANK[wanted]) {
                keep = false;
            }
        } else if (cell !== wanted.replace('_', ' ').toUpperCase()) {
            keep = false;
        }
    });

    // The text box matches the key and the title only.
    if (keep && text !== '') {
        var key = row.children('td').eq(0).text().toLowerCase();
        var title = row.children('td').eq(1).text().toLowerCase();
        if ((key + ' ' + title).indexOf(text) === -1) {
            keep = false;
        }
    }

    return keep;
}

/* One chip per filter that is switched on. */
function renderChips() {
    var chips = $('#filter-chips');

    chips.html('');

    $('#filter-bar').find('select').each(function () {
        var label;
        var choice;
        var chip;

        if ($(this).val() === '') {
            return;
        }

        label = FILTER_LABELS[this.id];
        choice = $(this).find('option:selected').text().trim();

        chip = $('<span>').addClass('filter-chip')
                          .attr('data-for', this.id)
                          .text(label + ': ' + choice + ' ');

        chip.append(
            $('<button>').attr('type', 'button')
                         .html('&times;')
        );

        chips.append(chip);
    });
}

function applyFilters() {
    var text = $('#filter-search').val().trim().toLowerCase();
    var visible = 0;
    var rows;

    // Clear the "nothing matched" row left by a previous run.
    $('#issue-table').find('tr.no-results').remove();

    rows = issueRows();

    rows.each(function () {
        var row = $(this);

        if (rowMatches(row, text)) {
            row.show();               // modifies an existing element
            visible = visible + 1;
        } else {
            row.hide();
        }
    });

    renderChips();
    $('#result-count').html('<strong>' + visible + '</strong> of ' + rows.length + ' issues');

    // Adds a new element when the filters exclude everything.
    if (visible === 0) {
        $('#issue-table').children('tbody').append(
            $('<tr>').addClass('no-results').append(
                $('<td>').attr('colspan', 7)
                         .text('No issues match these filters. Clear one to see more.')
            )
        );
    }
}

function initListFilter() {
    if ($('#filter-bar').length === 0) {
        return;                       // not the issue list
    }

    // The change event drives the whole thing.
    $('#filter-bar').on('change', 'select', applyFilters);
    $('#filter-bar').on('input', '#filter-search', applyFilters);

    // Filtering happens in place, so the form must not navigate away.
    $('#filter-bar').on('submit', function (e) {
        e.preventDefault();
        applyFilters();
    });

    // The chips are made by this script, so the handler goes on the container
    // rather than on buttons that do not exist yet.
    $('#filter-chips').on('click', 'button', function () {
        var chip = $(this).closest('.filter-chip');
        $('#' + chip.attr('data-for')).val('');
        applyFilters();
    });

    $('#clear-filters').on('click', function (e) {
        e.preventDefault();
        $('#filter-bar').find('select').val('');
        $('#filter-search').val('');
        applyFilters();
    });

    // Run once so the count and chips match the filters the page loaded with.
    applyFilters();
}


/* Issue workflow */
/* Interaction two, on the click event. This is the delegation one: advancing
   the workflow replaces the button that advances it, so the next control does
   not exist at load. One handler on the action bar catches them all. */

/* What each step's button says, and which step follows it. */
var NEXT_STEP = {
    UNDER_REVIEW: { label: 'Confirm Fix and Verify', next: 'VERIFIED' },
    VERIFIED: null
};

/* Today, in the two forms the timeline needs. */
function todayParts() {
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var year = now.getFullYear();

    return {
        attribute: year + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day,
        shown: month + '/' + day + '/' + year
    };
}

function advanceTo(state) {
    var step = $('#workflow').children('li[data-state="' + state + '"]');
    var stamp = todayParts();
    var group = $('#workflow-actions');
    var after = NEXT_STEP[state];

    if (step.length === 0) {
        return;
    }

    // The step that was current is finished, and the one reached takes over.
    $('#workflow').children('li.is-current').removeClass('is-current').addClass('is-done');
    step.addClass('is-current');

    // Adds a date to the step just reached.
    if (step.children('time').length === 0) {
        step.append($('<time>').attr('datetime', stamp.attribute).text(stamp.shown));
    }

    // Modifies the status chip up in the title row.
    $('#issue-status').removeClass(STATUS_CLASSES)
                      .addClass(chipClass('status', state))
                      .text(state.replace('_', ' '));

    // Adds the button for the next step. This is what makes delegation
    // necessary, since it did not exist when the page loaded.
    group.find('[data-action="advance"]').remove();

    if (after) {
        group.prepend(
            $('<button>').attr('type', 'button')
                         .addClass('btn btn--info')
                         .attr('data-action', 'advance')
                         .attr('data-next', after.next)
                         .text(after.label)
        );
    } else {
        group.prepend(
            $('<p>').addClass('action-bar__note')
                    .text('Verified by Priya Nair. Nothing further is needed on this issue.')
        );
    }
}

/* The "Are you sure?" the Project 2 prototype could not build without JS.
   From the "ask before actually deleting it" feedback. */
function openDeleteConfirm(button) {
    var panel;

    if ($('#delete-confirm').length > 0) {
        return;                       // already open
    }

    button.prop('disabled', true);    // modifies an existing element

    panel = $('<div>').attr('id', 'delete-confirm').addClass('confirm-panel');
    panel.append($('<p>').text(
        'Delete CLM-139? This removes the issue, its notes and its role history. ' +
        'Only a lead can do this, and it cannot be undone.'
    ));
    panel.append(
        $('<button>').attr('type', 'button').addClass('btn btn--danger')
                     .attr('data-action', 'delete-confirm').text('Yes, delete it')
    );
    panel.append(
        $('<button>').attr('type', 'button').addClass('btn')
                     .attr('data-action', 'delete-cancel').text('Keep it')
    );

    $('#issue-actions').append(panel);
}

function initIssueWorkflow() {
    if ($('#issue-actions').length === 0) {
        return;                       // not the issue page
    }

    // One delegated handler for every action in the bar, now and later.
    $('#issue-actions').on('click', '[data-action]', function () {
        var button = $(this);
        var action = button.attr('data-action');

        if (action === 'advance') {
            advanceTo(button.attr('data-next'));

        } else if (action === 'delete') {
            openDeleteConfirm(button);

        } else if (action === 'delete-cancel') {
            $('#delete-confirm').remove();
            $('#issue-actions').find('[data-action="delete"]').prop('disabled', false);

        } else if (action === 'delete-confirm') {
            $('#delete-confirm').replaceWith(
                $('<p>').addClass('action-bar__note').text(
                    'CLM-139 would be deleted here. The prototype keeps it so you can ' +
                    'carry on looking at it.'
                )
            );
        }
    });
}


/* Start everything once the page is ready. */
$(document).ready(function () {
    initSearch();
    initListFilter();
    initIssueWorkflow();
});
