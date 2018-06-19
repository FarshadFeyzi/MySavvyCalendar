/**
 * 
 * searchResults.js
 * General set up functions and search
 */

    //global variable to make dynamic autocomplete work with changing categories
    let globalAutoComplete = null;
    let thesaurus = require("thesaurus");

    global.init = function() {
        scheduler.config.lightbox_recurring = "instance";
        scheduler.config.details_on_create=true;
        scheduler.config.details_on_dblclick=true;
        scheduler.config.include_end_by = true;
        scheduler.config.repeat_precise = true;        
        var today = new Date();	
        scheduler.init('scheduler_here',today, "week");	
        loadUserEvents();
        handleEventDeleted();
        scheduler.setCurrentView(today);
    };
    


    global.currentEvents = function () {
        firebase.auth().onAuthStateChanged(function (user) {
            let currEvents = [];
            if (user) {
                let userEventsRef = firebase.database().ref('users/' + user.uid + "/events/");
                userEventsRef.once("value", function(events) {
                    events.forEach(function (e) {
                        currEvents.push(e.val());
                        createTable(e.val(), false, true);
                    });
                });
            }
        });
    }

    function loadUserEvents() {
        scheduler.attachEvent("onSchedulerReady", function(){
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    firebase.database().ref('users/' + user.uid).once('value').then(function (snapshot) {
                        let userProfileRef = firebase.database().ref('users/' + user.uid + "/events/");
                        userProfileRef.once("value", function(events) {
                            events.forEach(function(a) {
                                let e_ = a.val();
                                let add = {};
                                if (e_.type === "event") {
                                    add = {
                                        start_date: e_.start_date,
                                        end_date: e_.end_date,
                                        text: e_.text,
                                    }
                                } else if (e_.type === "course") {
                                    let start = new Date(String(e_.start_date.replace("T", ' ')));
                                    let end = new Date(String(e_.end_date.replace("T", ' ')));
                                    let s_ = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes());
                                    let ee_ = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes());
                                    add = {
                                        start_date: s_,
                                        end_date: ee_,
                                        text: e_.text,
                                        details: e_.details,
                                        rec_type: e_.rec_type,
                                        event_length: e_.event_length,
                                        event_pid: e_.event_pid
                                    }
                                }
                                let id = scheduler.addEvent(add);
                                let ref = firebase.database().ref('users/' + user.uid + "/events/" + e_.text + "/id");
                                ref.set(id);
                            });
                        });
                    });
                }
            });
        });
    }

    function handleEventDeleted() {
        scheduler.attachEvent("onEventDeleted", function(id){
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    firebase.database().ref('users/' + user.uid).once('value').then(function (snapshot) {
                        let userProfileRef = firebase.database().ref('users/' + user.uid + "/events/");
                        userProfileRef.once("value", function(e) {
                            e.forEach(function(w) {
                                //id = String(id.substr(0,id.indexOf('#')));
                                id = (id + "").split("#")[0];
                                if (Number(w.val().id) === Number(id)) {
                                    if (w.val().type === "course") {
                                        scheduler.deleteEvent(id);
                                    }
                                    userProfileRef.child(String(w.val().text)).remove();
                                    
                                }
                            })
                        })
                    });
                }
            });
        });
    }
    
    /**
     * Toggles all buttons in the category section to their opposite current value
     */
    global.toggleAll = function() {
        let catref = firebase.database().ref("/categories");
        let count = 0;
        catref.once("value", function(s) {
            count = s.val().category_count;
            for ( let i = 0; i < count+1; i++ ) {
                $("input[name='chbox" + i + "']").bootstrapSwitch('toggleState');
            }

        });
    }

    global.grabRecommendations = function () {
        firebase.auth().onAuthStateChanged(function (user) {
            let currEvents = [];
            let eventsRef = firebase.database().ref('events/');
            let categoriesRef = firebase.database().ref('categories/');
            let courseref = firebase.database().ref("/courses/UCI Courses/Terms/Winter 2018/Department/Computer Science");
            let categories_ = [];
            let recommendations = [];
            if (user) {
                let userEventsRef = firebase.database().ref('users/' + user.uid + "/events/");
                userEventsRef.once("value", function(events) {
                    events.forEach(function (e) {
                        currEvents.push(e.val());
                    });
                    categoriesRef.once("value", function(cats) {
                        cats.forEach(function(o) {
                            if (o.val().category !== undefined)
                                categories_.push(o.val().category);
                        });
                        currEvents.forEach(function(currentEvent) {
                        if (currentEvent.type === "event") {
                            let words = currentEvent.text.split(" ");
                            let actual_words = [];
                            let ignore = ["the","or","it","and","them","that","this"];
                            words.forEach(function(a) {if (ignore.indexOf(a) === -1) actual_words.push(a);});
                            eventsRef.once("value", function(s) {
                                categories_.forEach(function(c) {
                                    s.child(c).forEach(function(event) {
                                        let found = false;
                                        if (event.val().name === undefined) return;
                                        actual_words.forEach(function(u, idx) {
                                            if (event.val().name.indexOf(u) !== -1 && !found) {
                                                found = true;
                                                recommendations.push(event.val());
                                                idx = actual_words.length;
                                                createTable(event.val(), true, true);
                                            }
                                        });
                                    });
                                });
                            });
                        }
                    });
                    })
                });
            }
        });
    };

    /**
     * Grab current state of all categories in "show categories" and load event data based on selected categories
     */
    global.loadUserCategories = function() {
        if (globalAutoComplete !== null)
            globalAutoComplete.destroy();
        let catref = firebase.database().ref("/categories");
        let eventref = firebase.database().ref("/events");
        let courseref = firebase.database().ref("/courses/UCI Courses/Terms/Winter 2018/Department/Computer Science");
        let count = 0;
        let allCats = [];
        let userCats = [];
        catref.once("value", function(s) {
            let filteredEvents = [];
            s.forEach(function(o) {
                if (o.val().category !== undefined)
                    allCats.push(o.val().category);
            });
            count = s.val().category_count;
            for ( let i = 0; i < count; i++ ) {
                if($("input[name='chbox" + i + "']").bootstrapSwitch('state')) {
                    userCats.push(allCats[i]);
                }
            }
            let options = ["UCI Courses", "Daytime Events", "Nighttime Events"];
            for ( let i =count; i < count+3; i++ ) {
                if($("input[name='chbox" + String(i) + "']").bootstrapSwitch('state')) {
                    userCats.push(options[i-count]);
                }
            }
            //get events according to user categories
            eventref.once("value", function(s) {
                //loop user events
                userCats.forEach(function(c, idx) {
                    s.child(c).forEach(function(event, idx) {
                        if (event.val().name !== undefined) {
                            let test = true;
                            let date = new Date(event.val().start_time.replace('T', ' '));
                            if (userCats.indexOf("Daytime Events") !== -1) {
                                if (date.getHours() < 17 && date.getHours() > 6 && test) {
                                    filteredEvents.push(String(event.val().name));
                                    test = false;
                                }
                            }
                            if (userCats.indexOf("Nighttime Events") !== -1 && test) {
                                if (date.getHours() >= 17 || date.getHours() <= 6) {
                                    filteredEvents.push(String(event.val().name));
                                    test = false;
                                }
                            } 
                        }
                    });
                });
            //courses
            courseref.once("value", function(a) {
                a.forEach(function(course) {
                    if (userCats.indexOf("UCI Courses") !== -1 && String(course.key) !== "count")
                        filteredEvents.push(String(course.key + ": " + course.val().name));
                });
            });
            globalAutoComplete = new autoComplete({
                selector: '#search',
                minChars: 1,
                function: $("#search").keyup(function(event) {
                    if (event.keyCode === 13) {
                        $("#submit").click();
                    }
                }),
                source: function(term, suggest){
                    term = term.toLowerCase();
                    var choices = filteredEvents;
                    var suggestions = [];
                    //https://tartarus.org/martin/PorterStemmer/
                    var stemmer = (function(){
                        var step2list = {
                                "ational" : "ate",
                                "tional" : "tion",
                                "enci" : "ence",
                                "anci" : "ance",
                                "izer" : "ize",
                                "bli" : "ble",
                                "alli" : "al",
                                "entli" : "ent",
                                "eli" : "e",
                                "ousli" : "ous",
                                "ization" : "ize",
                                "ation" : "ate",
                                "ator" : "ate",
                                "alism" : "al",
                                "iveness" : "ive",
                                "fulness" : "ful",
                                "ousness" : "ous",
                                "aliti" : "al",
                                "iviti" : "ive",
                                "biliti" : "ble",
                                "logi" : "log"
                            },
                            step3list = {
                                "icate" : "ic",
                                "ative" : "",
                                "alize" : "al",
                                "iciti" : "ic",
                                "ical" : "ic",
                                "ful" : "",
                                "ness" : ""
                            },
                            c = "[^aeiou]",          // consonant
                            v = "[aeiouy]",          // vowel
                            C = c + "[^aeiouy]*",    // consonant sequence
                            V = v + "[aeiou]*",      // vowel sequence
                            mgr0 = "^(" + C + ")?" + V + C,               // [C]VC... is m>0
                            meq1 = "^(" + C + ")?" + V + C + "(" + V + ")?$",  // [C]VC[V] is m=1
                            mgr1 = "^(" + C + ")?" + V + C + V + C,       // [C]VCVC... is m>1
                            s_v = "^(" + C + ")?" + v;                   // vowel in stem
                        return function (w) {
                            var 	stem,
                                suffix,
                                firstch,
                                re,
                                re2,
                                re3,
                                re4,
                                origword = w;
                            if (w.length < 3) { return w; }
                            firstch = w.substr(0,1);
                            if (firstch == "y") {
                                w = firstch.toUpperCase() + w.substr(1);
                            }
                            // Step 1a
                            re = /^(.+?)(ss|i)es$/;
                            re2 = /^(.+?)([^s])s$/;
                            if (re.test(w)) { w = w.replace(re,"$1$2"); }
                            else if (re2.test(w)) {	w = w.replace(re2,"$1$2"); }
                            // Step 1b
                            re = /^(.+?)eed$/;
                            re2 = /^(.+?)(ed|ing)$/;
                            if (re.test(w)) {
                                var fp = re.exec(w);
                                re = new RegExp(mgr0);
                                if (re.test(fp[1])) {
                                    re = /.$/;
                                    w = w.replace(re,"");
                                }
                            } else if (re2.test(w)) {
                                var fp = re2.exec(w);
                                stem = fp[1];
                                re2 = new RegExp(s_v);
                                if (re2.test(stem)) {
                                    w = stem;
                                    re2 = /(at|bl|iz)$/;
                                    re3 = new RegExp("([^aeiouylsz])\\1$");
                                    re4 = new RegExp("^" + C + v + "[^aeiouwxy]$");
                                    if (re2.test(w)) {	w = w + "e"; }
                                    else if (re3.test(w)) { re = /.$/; w = w.replace(re,""); }
                                    else if (re4.test(w)) { w = w + "e"; }
                                }
                            }
                            // Step 1c
                            re = /^(.+?)y$/;
                            if (re.test(w)) {
                                var fp = re.exec(w);
                                stem = fp[1];
                                re = new RegExp(s_v);
                                if (re.test(stem)) { w = stem + "i"; }
                            }
                            // Step 2
                            re = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/;
                            if (re.test(w)) {
                                var fp = re.exec(w);
                                stem = fp[1];
                                suffix = fp[2];
                                re = new RegExp(mgr0);
                                if (re.test(stem)) {
                                    w = stem + step2list[suffix];
                                }
                            }
                            // Step 3
                            re = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/;
                            if (re.test(w)) {
                                var fp = re.exec(w);
                                stem = fp[1];
                                suffix = fp[2];
                                re = new RegExp(mgr0);
                                if (re.test(stem)) {
                                    w = stem + step3list[suffix];
                                }
                            }
                            // Step 4
                            re = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/;
                            re2 = /^(.+?)(s|t)(ion)$/;
                            if (re.test(w)) {
                                var fp = re.exec(w);
                                stem = fp[1];
                                re = new RegExp(mgr1);
                                if (re.test(stem)) {
                                    w = stem;
                                }
                            } else if (re2.test(w)) {
                                var fp = re2.exec(w);
                                stem = fp[1] + fp[2];
                                re2 = new RegExp(mgr1);
                                if (re2.test(stem)) {
                                    w = stem;
                                }
                            }
                            // Step 5
                            re = /^(.+?)e$/;
                            if (re.test(w)) {
                                var fp = re.exec(w);
                                stem = fp[1];
                                re = new RegExp(mgr1);
                                re2 = new RegExp(meq1);
                                re3 = new RegExp("^" + C + v + "[^aeiouwxy]$");
                                if (re.test(stem) || (re2.test(stem) && !(re3.test(stem)))) {
                                    w = stem;
                                }
                            }
                            re = /ll$/;
                            re2 = new RegExp(mgr1);
                            if (re.test(w) && re2.test(w)) {
                                re = /.$/;
                                w = w.replace(re,"");
                            }
                            // and turn initial Y back to y
                            if (firstch == "y") {
                                w = firstch.toLowerCase() + w.substr(1);
                            }
                            return w;
                        }
                    })();                    
                    let words = term.split(/\s|\/|\\|\?/);
                    let synonyms = [];
                    words.forEach(function(entry) {
                        let w = thesaurus.find(entry);
                        synonyms = synonyms.concat(w);
                    });
                    for (i=0;i<choices.length;i++) {
                        if (~choices[i].toLowerCase().indexOf(stemmer(term))) {
                            suggestions.push(choices[i]);
                        } else {
                            let len = synonyms.length;
                            for ( let j = 0; j < len && j < 50; j++ ) {
                                if (~choices[i].toLowerCase().indexOf(stemmer(synonyms[j]))) {
                                    suggestions.push(choices[i]);
                                    break;
                                }
                            }
                        }
                    }
                    suggest(suggestions);
                    }
                }); 
            });
        });
        $('#categoriesModal').modal('hide');    
        $('#preferencesModal').modal('hide');    
    }


    global.addCalendarEvent = function() {
        let eventRef = firebase.database().ref("/events");
        let catRef = firebase.database().ref("/categories");
        let courseRef = firebase.database().ref("/courses/UCI Courses/Terms/Winter 2018/Department/Computer Science");
        let categories = [];
        let query = $('#search').val();
        let eventFound = false;
        let eventID = 0;
        let eventType = "event";
        catRef.once("value", function(s) {
            s.forEach(function(cat) {
                if (cat.val().category !== undefined)
                    categories.push(cat.val().category);
            });
            eventRef.once("value", function(p) {
                function addCalendarEvent(event, type) {
                    eventType = type;
                    let start = new Date(String(event.val().start_time.replace("T", ' ')));
                    let start_ = start.getDate() + "-" + String(parseInt(start.getMonth())+ 1) + "-" + start.getFullYear() + " " + start.getHours() + ":" + start.getMinutes() + ":" + start.getSeconds();
                    let end = new Date(String(event.val().end_time.replace("T", ' ')));
                    let end_ = end.getDate() + "-" + String(parseInt(end.getMonth())+ 1) + "-" + end.getFullYear() + " " + end.getHours()+ ":" + end.getMinutes() + ":" + end.getSeconds();
                    let s_ = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes());
                    let e_ = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours(), end.getMinutes());
                    let ev_length = Math.abs(end.getHours() - start.getHours()) + ":" + Math.abs(start.getMinutes() - end.getMinutes()) + ":" + Math.abs(start.getSeconds() - end.getSeconds());
                    let a = ev_length.split(":");
                    let len = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);
                    let rec = "week_1___";
                    if (type === "event") {
                         eventID = scheduler.addEvent({
                            start_date: start_,
                            end_date: end_,
                            text: String(event.val().name)
                        });
                     } else if (type === "course") {
                        let days = {"MWF": "1,3,5", "TuTh": "2,4", "MW": "1,3", "M": "1", "W": "3", "F": "5", "WF": "3,5"};
                        for (k in days) {
                            if (event.val().meeting_time === k) {
                                rec += days[k];
                            } 
                        }
                        eventID = scheduler.addEvent({
                            start_date: s_,
                            end_date: e_,
                            text: event.val().name,
                            details: "",
                            rec_type: rec,
                            event_pid: 0,
                            event_length: len
                        });
                    }
                    firebase.auth().onAuthStateChanged(function(user) {
                        if (user) {
                            firebase.database().ref('users/' + user.uid).once('value').then(function (snapshot) {
                                let ee_ = {};
                                if (eventType === "event") {
                                    ee_[String(event.val().name)] = {
                                        start_date: start_,
                                        end_date: end_,
                                        text: String(event.val().name),
                                        id: eventID,
                                        type: eventType,
                                    };
                                } else if (eventType === "course") {
                                    ee_[String(event.val().name)] = {
                                        start_date: s_,
                                        end_date: e_,
                                        text: String(event.val().name),
                                        details: "",
                                        id: eventID,
                                        rec_type: rec,
                                        type: eventType,
                                        event_length: len,
                                        event_pid: 0
                                    };
                                }
                                let userProfileRef = firebase.database().ref('users/' + user.uid + "/events");
                                userProfileRef.update(ee_);
                            });
                        }
                    });
                    return start;
                }
                categories.forEach(function(c, idx) {
                    p.child(c).forEach(function(event, idx) {
                        if (event.val().name !== undefined && (String(event.val().name.replace(/ /g, '')) === query.replace(/ /g, ''))) {
                                eventFound = true;
                                let view_time = addCalendarEvent(event, "event");
                                let start = new Date(String(event.val().start_time.replace("T", ' ')));
                                $('#eventModal').modal('toggle');
                                $('#eventAddedModal').modal('toggle');
                                $('#event_name2').text(String(event.val().name));
                                $('#event_start2').text(start);
                                scheduler.setCurrentView(new Date(view_time));
                        }
                    });
                });
                if (!eventFound) {
                    courseRef.once("value", function(m) {
                        m.forEach(function(course) {
                            if (query === (String(course.key + ": " + course.val().name))) {
                                eventFound = true;
                                let view_time = addCalendarEvent(course, "course");
                                let start = new Date(String(course.val().start_time.replace("T", ' ')));
                                $('#eventModal').modal('toggle');
                                $('#eventAddedModal').modal('toggle');
                                $('#event_name2').text(String(course.val().name));
                                $('#event_start2').text(start);
                                scheduler.setCurrentView(new Date(view_time));
                            }
                        });
                    });
                }
                eventFound = false;
            });
        });
    }
    global.grabQueriedEvent = function() {
            let eventRef = firebase.database().ref("/events");
            let catRef = firebase.database().ref("/categories");
            let courseRef = firebase.database().ref("/courses/UCI Courses/Terms/Winter 2018/Department/Computer Science");
            let categories = [];
            let eventFound = false;
            let query = $('#search').val();
            catRef.once("value", function(s) {
                s.forEach(function(cat) {
                    if (cat.val().category !== undefined)
                        categories.push(cat.val().category);
                });
                eventRef.once("value", function(p) {
                    categories.forEach(function(c, idx) {
                        p.child(c).forEach(function(event, idx) {
                            if (event.val().name !== undefined && (String(event.val().name.replace(/ /g, '')) === query.replace(/ /g, ''))) {
                                let start = new Date(String(event.val().start_time.replace("T", ' ')));
                                eventFound = true;
                                $('#event_name').text(String(event.val().name));
                                $('#event_url').text(String(event.val().url));
                                $('#event_url').attr('href', String(event.val().url));
                                $('#event_start').text(start);
                                $('#event_description').text(String(event.val().description));
                                $('#eventModal').modal('toggle');
                            }
                        });
                    });
                });
                if (!eventFound) {
                    courseRef.once("value", function(a) {
                        a.forEach(function(course) {
                            if (query === (String(course.key + ": " + course.val().name))) {
                                eventFound = true;
                                let start = new Date(String(course.val().start_time.replace("T", ' ')));
                                let end = new Date(String(course.val().end_time.replace("T", ' ')));
                                let time_range = start.getHours() + ":" + (start.getMinutes()<10?'0':'') + start.getMinutes() + " - " + end.getHours() + ":" + (end.getMinutes()<10?'0':'') + end.getMinutes();
                                $('#event_name').text(String(course.val().name));
                                $('#event_url').text("https://www.reg.uci.edu/perl/WebSoc");
                                $('#event_url').attr('href', "https://www.reg.uci.edu/perl/WebSoc");
                                $('#event_start').text(course.val().meeting_time + ", " + time_range);
                                $('#event_description').text(String(course.val().name));
                                $('#eventModal').modal('toggle');
                            }
                        });
                    });
                }
            });
            
            eventFound = false;
        }   

    /**
     * create category check boxes in "show categories"
     */
    global.createCheckBox = function() {
        let ref = firebase.database().ref("/categories/");
        let count = 0;
        let categories = [];
        ref.once("value", function(s) {
            count = s.val().category_count;
            s.forEach(function(category) {
                if (category.val().category !== undefined) {
                    categories.push(String(category.val().category));
                }
            });
            categories.forEach(function(cats, idx) {
                $('#mbody').append("<h2 class=\"h4\">" + cats + "</h2>");
                $('#mbody').append("<input type=\"checkbox\" name=\"chbox" + String(idx) + "\" checked=\"true\">");
                $("[name='chbox" + String(idx) + "']").bootstrapSwitch();
            });
                $('#prefmodalbody').append("<h2 class=\"h4\">" + "UCI Courses" + "</h2>");
                $('#prefmodalbody').append("<input type=\"checkbox\" name=\"chbox" + String(count) + "\" checked=\"true\">");
                $("[name='chbox" + String(count) + "']").bootstrapSwitch();
                $('#prefmodalbody').append("<h2 class=\"h4\">" + "Daytime Events" + "</h2>");
                $('#prefmodalbody').append("<input type=\"checkbox\" name=\"chbox" + String(count+1) + "\" checked=\"true\">");
                $("[name='chbox" + String(count+1) + "']").bootstrapSwitch();
                $('#prefmodalbody').append("<h2 class=\"h4\">" + "Nighttime Events" + "</h2>");
                $('#prefmodalbody').append("<input type=\"checkbox\" name=\"chbox" + String(count+2) + "\" checked=\"true\">");
                $("[name='chbox" + String(count+2) + "']").bootstrapSwitch();
        });
    }

  

    global.loadData = function() {
        let db = firebase.database();
        let eventsRef = db.ref("/events");
        let catRef = db.ref("/categories/");
        let user = "";
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
              user = firebase.auth().currentUser.uid;
            }
          });
        let eventCount = 0;
        let categoryCount = 0;
        let currentEvents = [];
        let queryEvents = [];
        let categories = [];
        query = $('#search').val(); //current search string
        
    }

    global.signOut = function() {
		var user = firebase.auth().currentUser;
		if (user != null) {
			firebase.auth().signOut().then(function(error) {
				window.location.href = "index.html";
			});	
		}
    }
    
	global.openExplore = function() {
        document.getElementById("exploreTab").style.width = "500px";
        openRecommendations();

	}
	global.closeExplore = function() {
        document.getElementById("exploreTab").style.width = "0";
        clearTable();
	}
    global.openRecommendations = function() {
        this.clearTable();
        document.getElementById("recommendations").className = "active";
        this.grabRecommendations();
		document.getElementById("currentEvents").className = "";
		document.getElementById("allevents").className = "";

	}
	global.openCurrentEvents = function() {
        this.clearTable();
        this.currentEvents();
		document.getElementById("currentEvents").className = "active";
		document.getElementById("recommendations").className = "";
		document.getElementById("allevents").className = "";
	}
	global.openAllEvents = function() {
        clearTable();
		document.getElementById("allevents").className = "active";
		document.getElementById("recommendations").className = "";
        document.getElementById("currentEvents").className = "";
        let e_ = []
        let eventRef = firebase.database().ref("/events");
        let catRef = firebase.database().ref("/categories");
        let categories = [];
        catRef.once("value", function(s) {
            s.forEach(function(cat) {
                if (cat.val().category !== undefined)
                    categories.push(cat.val().category);
            });
            eventRef.once("value", function(p) {
                categories.forEach(function(c, idx) {
                    p.child(c).forEach(function(event, idx) {
                        if (!Number.isInteger(event.val()) && event.val() !== undefined && event.val().name !== undefined) {
                            e_.push(event.val());
                        }
                    });
                });
                createTable(e_, true, false);
            });
        });
    }

	global.createTable = function(events, ae, obj) {
		var table = document.createElement('table');
		table.className="table table-bordered table-hover";
		table.id = "eventTable";
        if (obj) {
            var tbody = document.createElement('tbody');
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            let text = "";
            if (ae === true) {
                text = document.createTextNode(events.name);
            }
            else 
                text = document.createTextNode(events.text);
            td.appendChild(text);
            tr.appendChild(td);
            tbody.appendChild(tr);
            table.appendChild(tbody);
        } else {
            for ( let i = 0; i < events.length; i++ ) {
                var tbody = document.createElement('tbody');
                var tr = document.createElement('tr');
                var td = document.createElement('td');
                let text = "";
                if (ae === true) {
                    text = document.createTextNode(events[i].name);
                }
                else 
                    text = document.createTextNode(events[i].text);
                td.appendChild(text);
                tr.appendChild(td);
                tbody.appendChild(tr);
                table.appendChild(tbody);
            }
        }
		document.getElementById("scrollNav").appendChild(table);
    }
    
	global.clearTable = function() {
		var parent = document.getElementById("scrollNav");
		while (parent.hasChildNodes()) {
			parent.removeChild(parent.lastChild);
		}
	}
