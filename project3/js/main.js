/* Clamped
   Adds Page Behavior: the simulated search, the issue list filter,
   and the issue workflow. Interactive capabilities from jQuery. */


/* ==================================================================
   SIMULATED SEARCH (search.html)
   Reads ?q= from the GET form; a switch shows results or an error.
   ================================================================== */

function initSearch() {
    var params = new URLSearchParams( window.location.search );
    var query = "";

    if ( $( "#search-results" ).length === 0 ) {
        return; // not the search page
    }

    // Trim whitespace and ignore capitals
    if ( params.has( "q" ) ) {
        query = params.get( "q" ).trim().toLowerCase();
    }

    $( "#topbar-search" ).val( params.get( "q" ) );

    // An empty search shows the starting prompt and does not result in failure
    if ( query === "" ) {
        return;
    }

    // Decide what to show using a switch statement
    switch ( query ) {
    case "payment":
    case "checkout":
        $( "#search-summary" ).text( "Found 2 issues matching \"" + query + "\"." );
        $( "#search-results" ).show();
        break;
    default:
        $( "#search-summary" ).text( "No issues matched \"" + query + "\"." );
        $( "#search-empty" ).show();
    }
}


/* ==================================================================
   INTERACTION 1: Filter issues (list.html)
   Event: change. Requirement: DOM traversal.
   Modifies: shows/hides rows. Adds: filter chips, "no match" row.
   Reference: https://api.jquery.com/category/traversing/
   ================================================================== */

/* The severity options read as "Medium and above". Severity is a
   minimum rather than an exact match. */
var SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/* Does one row pass every filter the user has switched on? */
function rowMatches( row, project, role, status, severity, text ) {
    var title;

    if ( project !== "" && row.data( "project" ) !== project ) {
        return false;
    }
    if ( role !== "" && row.data( "role" ) !== role ) {
        return false;
    }
    if ( status !== "" && row.data( "status" ) !== status ) {
        return false;
    }
    if ( severity !== "" && SEVERITY_RANK[ row.data( "severity" ) ] < SEVERITY_RANK[ severity ] ) {
        return false;
    }

    // The text box looks at the key and the title.
    // .find(): get the descendants of the row that match a selector.
    if ( text !== "" ) {
        title = row.find( ".ticket-key" ).text() + " " + row.find( ".issue-table__title" ).text();
        if ( title.toLowerCase().indexOf( text ) === -1 ) {
            return false;
        }
    }

    return true;
}

/* One removable chip for every dropdown that is not on "All". */
function showFilterChips() {
    var chips = $( "#filter-chips" );

    chips.html( "" );

    // .each(): iterate over the dropdowns while executing a function for each one.
    $( "#filter-bar" ).find( "select" ).each(function() {
        var elem = $( this );
        var label;
        var choice;

        if ( elem.val() === "" ) {
            return; // this filter is off
        }

        // .parent(): go up to the field around the dropdown and find its label.
        // Then find the option picked, e.g. "Project: clamped-web".
        // Referenced from the demo slides.
        label = elem.parent().find( "label" ).text();
        choice = elem.find( "option:selected" ).text();
        chips.append(
            "<span class='filter-chip' data-select='" + this.id + "'>" + label + ": " + choice +
            " <button type='button' title='Remove this filter'>&times;</button></span>"
        );
    });
}

function applyFilters() {
    var project = $( "#filter-project" ).val();
    var role = $( "#filter-role" ).val();
    var status = $( "#filter-status" ).val();
    var severity = $( "#filter-severity" ).val();
    var text = $( "#filter-search" ).val().trim().toLowerCase();
    var visible = 0;
    var rows;

    // Clear the "nothing matched" row left over from the last run.
    $( "#issue-rows" ).find( ".no-results" ).remove();

    // DOM traversal. .children(): get the children of the table body
    // that match a selector, so every row of the table.
    rows = $( "#issue-rows" ).children( "tr" );
    rows.each(function() {
        var row = $( this );

        // Modify: show or hide the existing row
        if ( rowMatches( row, project, role, status, severity, text ) ) {
            row.show();
            visible = visible + 1;
        } else {
            row.hide();
        }
    });

    $( "#result-count" ).html( "<strong>" + visible + "</strong> of " + rows.length + " issues" );
    showFilterChips();

    // Add: a message row when the filters leave nothing to show.
    if ( visible === 0 ) {
        $( "#issue-rows" ).append(
            "<tr class='no-results'><td colspan='7'>" +
            "No issues match these filters. Remove one to see more.</td></tr>"
        );
    }
}

function initListFilter() {
    if ( $( "#filter-bar" ).length === 0 ) {
        return; // not the issue list
    }

    // Event: Any dropdown or text box change re-runs the filter.
    $( "#filter-bar" ).on( "change", applyFilters );

    // No page reload on submit
    $( "#filter-bar" ).on( "submit", function( event ) {
        event.preventDefault();
        applyFilters();
    });

    // Delegated handler since the chips are added by the script.
    $( "#filter-chips" ).on( "click", "button", function() {
        var selectId = $( this ).parent().data( "select" );
        $( "#" + selectId ).val( "" );
        applyFilters();
    });

    $( "#clear-filters" ).on( "click", function( event ) {
        event.preventDefault();
        $( "#filter-bar" ).find( "select" ).val( "" );
        $( "#filter-search" ).val( "" );
        applyFilters();
    });

    applyFilters();
}


/* ==================================================================
   INTERACTION 2: Send for review (detail.html)
   Event: click. Requirement: event delegation.
   Modifies: status chip, timeline. Adds: "Remind Priya" button.
   Reference: https://learn.jquery.com/events/event-delegation/
   ================================================================== */

/* Hand the patched issue to its verifier. The user patched it, so they
   cannot verify it themselves; a verifier like "Priya Nair" can. */
function sendForReview() {
    // Modify: finish the current timeline step and start Under Review.
    $( "#workflow" ).children( ".is-current" ).removeClass( "is-current" ).addClass( "is-done" );
    $( "#workflow" ).children( "[data-state='UNDER_REVIEW']" )
        .addClass( "is-current" )
        .append( " <span class='text-caption'>sent to Priya Nair just now</span>" );

    // Modify: the status chip in the title row.
    $( "#issue-status" )
        .removeClass( "status-patched" )
        .addClass( "status-under-review" )
        .text( "UNDER REVIEW" );

    // Add: a new button for the next step, reminding the verifier.
    $( "#workflow-next" ).html(
        "<button type='button' class='btn btn--info' data-action='remind'>Remind Priya</button>"
    );
    $( "#workflow-note" ).text(
        "Priya Nair is reviewing your fix. You will be notified when it is verified."
    );
}

/* Ask before deleting, since it cannot be undone. */
function askToDelete( button ) {
    if ( $( "#delete-confirm" ).length > 0 ) {
        return; // already asking
    }

    button.hide();
    $( "#issue-actions" ).append(
        "<div class='confirm-panel' id='delete-confirm'>" +
        "<p>Delete CLM-139? This removes the issue, its notes and its role history, " +
        "and it cannot be undone.</p>" +
        "<button type='button' class='btn btn--danger' data-action='delete-confirm'>Yes, delete it</button>" +
        "<button type='button' class='btn' data-action='delete-cancel'>Keep it</button>" +
        "</div>"
    );
}

function initIssueWorkflow() {
    if ( $( "#issue-actions" ).length === 0 ) {
        return; // not the issue page
    }

    // Event delegation: handler is placed on the parent action bar and
    // responds to clicks on the buttons inside it, including the
    // "Remind Priya" button that replaces "Send for Review" once it's clicked.
    $( "#issue-actions" ).on( "click", "button", function() {
        var elem = $( this );

        switch ( elem.data( "action" ) ) {
        case "review":
            sendForReview();
            break;

        case "remind":
            elem.remove();
            $( "#workflow-next" ).append(
                "<span class='text-caption'>Reminder sent to Priya Nair.</span>"
            );
            break;

        case "delete":
            askToDelete( elem );
            break;

        case "delete-cancel":
            $( "#delete-confirm" ).remove();
            $( "#issue-actions" ).find( "[data-action='delete']" ).show();
            break;

        case "delete-confirm":
            $( "#delete-confirm" ).html(
                "<p>CLM-139 has been deleted. <a href='list.html'>Back to My Issues</a></p>"
            );
            break;
        }
    });
}


/* Start everything once the page is ready. Each init checks whether its
   page is the one loaded and returns if not. */
$( document ).ready(function() {
    initSearch();
    initListFilter();
    initIssueWorkflow();
});
