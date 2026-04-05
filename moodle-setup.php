<?php
/**
 * Moodle setup script for Open Badges 3.0 testing
 * Creates: student user, course, badge, enrollment, web service token
 */
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
global $DB, $CFG;
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/lib/enrollib.php');
require_once($CFG->dirroot . '/lib/badgeslib.php');
require_once($CFG->dirroot . '/badges/classes/badge.php');

echo "=== Moodle Open Badges Setup ===\n\n";

// ── 1. Create student user ──────────────────────────
echo "1. Creating student user...\n";
$existing = $DB->get_record('user', ['username' => 'student1']);
if ($existing) {
    echo "   Student 'student1' already exists (id: {$existing->id})\n";
    $studentid = $existing->id;
} else {
    $user = new stdClass();
    $user->username = 'student1';
    $user->password = 'Student1234!';
    $user->firstname = 'Max';
    $user->lastname = 'Mustermann';
    $user->email = 'student@university.edu';
    $user->confirmed = 1;
    $user->mnethostid = $CFG->mnet_localhost_id;
    $user->auth = 'manual';
    $studentid = user_create_user($user, true, false);
    echo "   Created student 'student1' (id: {$studentid})\n";
}

// ── 2. Create test course ────────────────────────────
echo "\n2. Creating test course...\n";
$course = $DB->get_record('course', ['shortname' => 'WEBDEV101']);
if ($course) {
    echo "   Course 'WEBDEV101' already exists (id: {$course->id})\n";
} else {
    $coursedata = new stdClass();
    $coursedata->fullname = 'Advanced Web Development';
    $coursedata->shortname = 'WEBDEV101';
    $coursedata->category = 1; // Default category
    $coursedata->summary = 'Full-stack web development with React and Node.js';
    $coursedata->format = 'topics';
    $coursedata->visible = 1;
    $course = create_course($coursedata);
    echo "   Created course 'WEBDEV101' (id: {$course->id})\n";
}

// ── 3. Enroll student in course ──────────────────────
echo "\n3. Enrolling student in course...\n";
$enrolinstances = enrol_get_instances($course->id, true);
$manualenrol = null;
foreach ($enrolinstances as $instance) {
    if ($instance->enrol === 'manual') {
        $manualenrol = $instance;
        break;
    }
}
if (!$manualenrol) {
    // Create manual enrollment instance
    $enrolplugin = enrol_get_plugin('manual');
    $instanceid = $enrolplugin->add_instance($course);
    $manualenrol = $DB->get_record('enrol', ['id' => $instanceid]);
    echo "   Created manual enrollment instance\n";
}

$enrolplugin = enrol_get_plugin('manual');
// Check if already enrolled
$context = context_course::instance($course->id);
if (is_enrolled($context, $studentid)) {
    echo "   Student already enrolled in WEBDEV101\n";
} else {
    $enrolplugin->enrol_user($manualenrol, $studentid, 5); // 5 = student role
    echo "   Enrolled student in WEBDEV101\n";
}

// ── 4. Create a badge for the course ─────────────────
echo "\n4. Creating course badge...\n";
$badgerec = $DB->get_record('badge', ['name' => 'Advanced Web Development Certificate']);
if ($badgerec) {
    echo "   Badge already exists (id: {$badgerec->id})\n";
    $badgeid = $badgerec->id;
} else {
    $now = time();
    $badge = new stdClass();
    $badge->name = 'Advanced Web Development Certificate';
    $badge->description = 'Awarded for completing the Advanced Web Development course with React and Node.js';
    $badge->timecreated = $now;
    $badge->timemodified = $now;
    $badge->usercreated = 2; // admin
    $badge->usermodified = 2;
    $badge->issuername = 'FH Dortmund';
    $badge->issuerurl = 'https://fh-dortmund.de';
    $badge->issuercontact = 'badges@fh-dortmund.de';
    $badge->expiredate = null;
    $badge->expireperiod = null;
    $badge->type = BADGE_TYPE_COURSE; // 2 = course badge
    $badge->courseid = $course->id;
    $badge->version = '1.0';
    $badge->language = 'en';
    $badge->imageauthorname = 'FH Dortmund';
    $badge->imageauthoremail = '';
    $badge->imageauthorurl = '';
    $badge->imagecaption = 'Advanced Web Development';
    $badge->message = 'Congratulations! You have been awarded the Advanced Web Development Certificate.';
    $badge->messagesubject = 'You earned a badge: Advanced Web Development Certificate';
    $badge->attachment = 1;
    $badge->notification = 1;
    $badge->status = BADGE_STATUS_ACTIVE; // 1 = active (ready to issue)

    $badgeid = $DB->insert_record('badge', $badge);
    echo "   Created badge (id: {$badgeid})\n";

    // Add manual award criteria so we can issue it
    $criteria = new stdClass();
    $criteria->badgeid = $badgeid;
    $criteria->criteriatype = BADGE_CRITERIA_TYPE_OVERALL; // 0
    $criteria->method = 1; // all
    $criteria->descriptionformat = FORMAT_HTML;
    $criteria->description = '';
    $DB->insert_record('badge_criteria', $criteria);

    $criteria2 = new stdClass();
    $criteria2->badgeid = $badgeid;
    $criteria2->criteriatype = BADGE_CRITERIA_TYPE_MANUAL; // 7
    $criteria2->method = 1;
    $criteria2->descriptionformat = FORMAT_HTML;
    $criteria2->description = '';
    $critid = $DB->insert_record('badge_criteria', $criteria2);

    // Admin role can award
    $param = new stdClass();
    $param->critid = $critid;
    $param->name = 'role_2'; // admin role
    $param->value = '2';
    $DB->insert_record('badge_criteria_param', $param);

    echo "   Added manual award criteria\n";
}

// ── 5. Issue the badge to the student ────────────────
echo "\n5. Issuing badge to student...\n";
$issued = $DB->get_record('badge_issued', ['badgeid' => $badgeid, 'userid' => $studentid]);
if ($issued) {
    echo "   Badge already issued to student (id: {$issued->id}, uniquehash: {$issued->uniquehash})\n";
} else {
    $badgeobj = new badge($badgeid);
    // Make sure badge is active
    if ($badgeobj->status != BADGE_STATUS_ACTIVE && $badgeobj->status != BADGE_STATUS_ACTIVE_LOCKED) {
        $badgeobj->set_status(BADGE_STATUS_ACTIVE);
        echo "   Activated badge\n";
    }

    $issuedrecord = new stdClass();
    $issuedrecord->badgeid = $badgeid;
    $issuedrecord->userid = $studentid;
    $issuedrecord->uniquehash = md5(uniqid(rand(), true));
    $issuedrecord->dateissued = time();
    $issuedrecord->dateexpire = null;
    $issuedrecord->visible = 1;
    $issuedrecord->issuerrole = 2;
    $issueid = $DB->insert_record('badge_issued', $issuedrecord);
    echo "   Badge issued! (id: {$issueid}, hash: {$issuedrecord->uniquehash})\n";
}

// ── 6. Create web service + token for wallet ─────────
echo "\n6. Setting up web service for Academic Wallet...\n";

// Create external service
$service = $DB->get_record('external_services', ['shortname' => 'academic_wallet']);
if ($service) {
    echo "   Service 'academic_wallet' already exists (id: {$service->id})\n";
} else {
    $service = new stdClass();
    $service->name = 'Academic Achievement Wallet';
    $service->shortname = 'academic_wallet';
    $service->enabled = 1;
    $service->restrictedusers = 0;
    $service->component = '';
    $service->timecreated = time();
    $service->timemodified = time();
    $service->downloadfiles = 1;
    $service->uploadfiles = 0;
    $service->id = $DB->insert_record('external_services', $service);
    echo "   Created external service (id: {$service->id})\n";

    // Add relevant functions to the service
    $functions = [
        'core_user_get_users',
        'core_user_get_users_by_field',
        'core_course_get_courses',
        'core_enrol_get_enrolled_users',
        'core_badges_get_user_badges',
        'core_webservice_get_site_info',
    ];
    foreach ($functions as $fname) {
        $func = $DB->get_record('external_functions', ['name' => $fname]);
        if ($func) {
            $sf = new stdClass();
            $sf->externalserviceid = $service->id;
            $sf->functionname = $fname;
            $DB->insert_record('external_services_functions', $sf);
        }
    }
    echo "   Added " . count($functions) . " functions to service\n";
}

// Create token for admin
$existingtoken = $DB->get_record('external_tokens', [
    'userid' => 2,
    'externalserviceid' => $service->id
]);
if ($existingtoken) {
    echo "   Token already exists: {$existingtoken->token}\n";
} else {
    require_once($CFG->dirroot . '/lib/externallib.php');
    $token = md5(uniqid(rand(), true));
    $tokenrecord = new stdClass();
    $tokenrecord->token = $token;
    $tokenrecord->tokentype = EXTERNAL_TOKEN_PERMANENT; // 0
    $tokenrecord->userid = 2; // admin
    $tokenrecord->externalserviceid = $service->id;
    $tokenrecord->contextid = 1; // system context
    $tokenrecord->creatorid = 2;
    $tokenrecord->timecreated = time();
    $tokenrecord->validuntil = 0; // no expiry
    $DB->insert_record('external_tokens', $tokenrecord);
    echo "   Created API token: {$token}\n";
}

// ── 7. Create a second course + badge (Language Certificate) ──
echo "\n7. Creating Language Certificate course & badge...\n";
$langcourse = $DB->get_record('course', ['shortname' => 'LANG-B2']);
if ($langcourse) {
    echo "   Course 'LANG-B2' already exists (id: {$langcourse->id})\n";
} else {
    $lcd = new stdClass();
    $lcd->fullname = 'German Language B2 Certificate';
    $lcd->shortname = 'LANG-B2';
    $lcd->category = 1;
    $lcd->summary = 'German language proficiency certificate at B2 level (CEFR)';
    $lcd->format = 'topics';
    $lcd->visible = 1;
    $langcourse = create_course($lcd);
    echo "   Created course 'LANG-B2' (id: {$langcourse->id})\n";
}

// Enroll in language course
$langcontext = context_course::instance($langcourse->id);
if (!is_enrolled($langcontext, $studentid)) {
    $enrolinstances2 = enrol_get_instances($langcourse->id, true);
    $manual2 = null;
    foreach ($enrolinstances2 as $inst) {
        if ($inst->enrol === 'manual') { $manual2 = $inst; break; }
    }
    if (!$manual2) {
        $ep = enrol_get_plugin('manual');
        $iid = $ep->add_instance($langcourse);
        $manual2 = $DB->get_record('enrol', ['id' => $iid]);
    }
    enrol_get_plugin('manual')->enrol_user($manual2, $studentid, 5);
    echo "   Enrolled student in LANG-B2\n";
} else {
    echo "   Student already enrolled in LANG-B2\n";
}

// Language badge
$langbadge = $DB->get_record('badge', ['name' => 'German B2 Language Certificate']);
if ($langbadge) {
    echo "   Language badge already exists (id: {$langbadge->id})\n";
    $langbadgeid = $langbadge->id;
} else {
    $lb = new stdClass();
    $lb->name = 'German B2 Language Certificate';
    $lb->description = 'Certified German language proficiency at CEFR B2 level';
    $lb->timecreated = time();
    $lb->timemodified = time();
    $lb->usercreated = 2;
    $lb->usermodified = 2;
    $lb->issuername = 'FH Dortmund Language Center';
    $lb->issuerurl = 'https://fh-dortmund.de/languages';
    $lb->issuercontact = 'languages@fh-dortmund.de';
    $lb->type = BADGE_TYPE_COURSE;
    $lb->courseid = $langcourse->id;
    $lb->version = '1.0';
    $lb->language = 'de';
    $lb->imageauthorname = 'FH Dortmund';
    $lb->imagecaption = 'German B2';
    $lb->message = 'Congratulations! You have been awarded the German B2 Language Certificate.';
    $lb->messagesubject = 'You earned a badge: German B2 Language Certificate';
    $lb->attachment = 1;
    $lb->notification = 1;
    $lb->status = BADGE_STATUS_ACTIVE;
    $langbadgeid = $DB->insert_record('badge', $lb);

    $c1 = new stdClass();
    $c1->badgeid = $langbadgeid;
    $c1->criteriatype = BADGE_CRITERIA_TYPE_OVERALL;
    $c1->method = 1;
    $c1->descriptionformat = FORMAT_HTML;
    $c1->description = '';
    $DB->insert_record('badge_criteria', $c1);

    $c2 = new stdClass();
    $c2->badgeid = $langbadgeid;
    $c2->criteriatype = BADGE_CRITERIA_TYPE_MANUAL;
    $c2->method = 1;
    $c2->descriptionformat = FORMAT_HTML;
    $c2->description = '';
    $cid = $DB->insert_record('badge_criteria', $c2);

    $p = new stdClass();
    $p->critid = $cid;
    $p->name = 'role_2';
    $p->value = '2';
    $DB->insert_record('badge_criteria_param', $p);

    echo "   Created language badge (id: {$langbadgeid})\n";
}

// Issue language badge
$langissued = $DB->get_record('badge_issued', ['badgeid' => $langbadgeid, 'userid' => $studentid]);
if ($langissued) {
    echo "   Language badge already issued\n";
} else {
    $li = new stdClass();
    $li->badgeid = $langbadgeid;
    $li->userid = $studentid;
    $li->uniquehash = md5(uniqid(rand(), true));
    $li->dateissued = time();
    $li->visible = 1;
    $li->issuerrole = 2;
    $DB->insert_record('badge_issued', $li);
    echo "   Language badge issued!\n";
}

echo "\n=== Setup Complete ===\n";
echo "Moodle URL:    http://localhost:8080\n";
echo "Admin login:   admin / Admin1234!\n";
echo "Student login: student1 / Student1234!\n";
echo "Courses:       WEBDEV101, LANG-B2\n";
echo "Badges:        Advanced Web Development Certificate, German B2 Language Certificate\n";
