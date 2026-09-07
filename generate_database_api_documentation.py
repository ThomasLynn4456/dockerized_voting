from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

OUTPUT = "d:\\voting\\Voting_System_Database_API_Documentation.docx"

doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.65)
section.bottom_margin = Inches(0.65)
section.left_margin = Inches(0.7)
section.right_margin = Inches(0.7)

styles = doc.styles
styles['Normal'].font.name = 'Aptos'
styles['Normal'].font.size = Pt(10)
for style_name, size, color in [('Title', 26, '12355B'), ('Heading 1', 18, '12355B'), ('Heading 2', 13, '1D6F8A'), ('Heading 3', 11, '12355B')]:
    style = styles[style_name]
    style.font.name = 'Aptos Display'
    style.font.size = Pt(size)
    style.font.color.rgb = RGBColor.from_string(color)
    style.font.bold = True


def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = tcPr.find(qn('w:shd'))
    if shd is None:
        shd = OxmlElement('w:shd')
        tcPr.append(shd)
    shd.set(qn('w:fill'), fill)


def set_cell_text(cell, text, bold=False, color=None):
    cell.text = ''
    p = cell.paragraphs[0]
    run = p.add_run(str(text))
    run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.style = 'Table Grid'
    for i, h in enumerate(headers):
        set_cell_text(t.rows[0].cells[i], h, True, 'FFFFFF')
        shade(t.rows[0].cells[i], '12355B')
    for row in rows:
        cells = t.add_row().cells
        for i, value in enumerate(row):
            set_cell_text(cells[i], value)
            if len(t.rows) % 2 == 0:
                shade(cells[i], 'EEF5F8')
    if widths:
        for row in t.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Inches(width)
    doc.add_paragraph()
    return t


def bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet' if level == 0 else 'List Bullet 2')
    p.add_run(text)
    return p


def numbered(text):
    p = doc.add_paragraph(style='List Number')
    p.add_run(text)
    return p


def code(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.right_indent = Inches(0.25)
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(5)
    run = p.add_run(text)
    run.font.name = 'Consolas'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor.from_string('243447')
    return p


def note(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.right_indent = Inches(0.2)
    run = p.add_run('Note: ')
    run.bold = True
    run.font.color.rgb = RGBColor.from_string('1D6F8A')
    p.add_run(text)
    return p

# Cover
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.space_after = Pt(18)
r = p.add_run('Voting System')
r.bold = True
r.font.name = 'Aptos Display'
r.font.size = Pt(30)
r.font.color.rgb = RGBColor.from_string('12355B')
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Database Tables, API Routes, and Session Storage')
r.bold = True
r.font.size = Pt(18)
r.font.color.rgb = RGBColor.from_string('1D6F8A')
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('Technical documentation generated from the current Spring Boot backend implementation').italic = True
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run('Project: d:\\voting').font.size = Pt(10)
doc.add_page_break()

# Overview
doc.add_heading('1. System Overview', level=1)
doc.add_paragraph('The application is a React/Vite frontend backed by a Spring Boot REST API. The backend uses Spring Data JPA, Flyway migrations, Hibernate, and a relational database. H2 is used by tests by default; MySQL-compatible DDL is used by the production migrations.')
table(['Area', 'Implementation'], [
    ('Frontend', 'React + Vite; calls the backend with fetch and credentials: include.'),
    ('Backend', 'Spring Boot REST controllers under com.voting.Gp3.controller.'),
    ('Persistence', 'Spring Data JPA repositories plus JdbcTemplate for dynamic title vote tables.'),
    ('Migrations', 'Flyway SQL files under src/main/resources/db/migration.'),
    ('Authentication', 'Spring Security for administrators; HttpSession attributes for student and teacher voting sessions.'),
    ('Images', 'Candidate photo/gallery metadata is stored in the database; uploaded image files are stored by ImageStorageService.'),
])

# Schema
doc.add_heading('2. Database Tables and Relationships', level=1)
doc.add_paragraph('The central entity is candidates. Titles describe election categories. Candidate participation in a title is represented either by a dynamic physical table named after the title or, in the fallback design, by title_candidates. The current application has TitleTableService enabled, so normal runtime voting uses the dynamic tables.')

doc.add_heading('2.1 Core table catalog', level=2)
table(['Table', 'Purpose', 'Important columns / constraints'], [
    ('candidates', 'Canonical candidate profile.', 'id PK; no; name; gender; age; major; talent; bio; photo.'),
    ('titles', 'Configured election titles/categories.', 'id PK; name UNIQUE; gender.'),
    ('candidate_images', 'Additional candidate gallery images.', 'id PK; candidate_id FK -> candidates.id; image_path; display_order.'),
    ('voter', 'Student identity and voting state.', 'id PK; username; major; phone_number UNIQUE; OTP fields; verified; has_voted.'),
    ('voter_voted_titles', 'Student titles already voted in.', 'Composite PK (voter_id, title_name); voter_id FK with cascade delete.'),
    ('admins', 'Administrator credentials.', 'id PK; name; email UNIQUE; password hash.'),
    ('teacher_vote_tokens', 'Teacher voting tokens and their lifecycle.', 'id PK; token UNIQUE; created_at; expires_at; used; active; voted_entries.'),
    ('published_title_results', 'Published winner and weights per title.', 'id PK; title_id FK; candidate_id FK; title_id UNIQUE.'),
    ('election_settings', 'Global voting deadline/closed flag.', 'id PK; voting_deadline; voting_closed.'),
])

doc.add_heading('2.2 Dynamic title vote tables', level=2)
doc.add_paragraph('TitleTableService converts a title name to a safe table key. For example, Mr. Popular becomes mr_popular. Each table contains one row per candidate registered for that title.')
table(['Column', 'Meaning'], [
    ('candidate_id', 'Primary key and foreign key to candidates.id; candidate deletion cascades at the database level when the FK exists.'),
    ('no', 'Candidate number within the title.'),
    ('name', 'Candidate display name copied into the title table.'),
    ('student_votes', 'Votes submitted by verified students.'),
    ('teacher_votes', 'Votes submitted by verified teachers.'),
    ('votes', 'Computed by queries as student_votes + teacher_votes; older migrations may also contain a stored votes column.'),
])
code('title name -> TitleTableService.tableName(title) -> dynamic SQL table\n"Mr. Popular" -> "mr_popular"')


doc.add_heading('2.3 Relationship summary', level=2)
table(['Relationship', 'Cardinality', 'Delete behavior / notes'], [
    ('Candidate -> CandidateImage', 'One-to-many', 'candidate_images.candidate_id references candidates.id. Controller explicitly deletes gallery rows/files before deleting a candidate.'),
    ('Candidate -> dynamic title table', 'One candidate to zero or many title rows', 'Each title table has candidate_id referencing candidates.id with ON DELETE CASCADE in migration DDL; controller also removes rows explicitly.'),
    ('Title -> PublishedTitleResult', 'One title to zero or one published result', 'title_id is unique and deletion cascades; controller deletes the published result before deleting a title.'),
    ('Candidate -> PublishedTitleResult', 'One candidate to zero or many results', 'candidate_id FK uses ON DELETE CASCADE in Flyway migration.'),
    ('Voter -> voter_voted_titles', 'One voter to many title names', 'ElementCollection stored in a separate table; rows cascade when voter is deleted.'),
    ('Title -> fallback TitleCandidate', 'Many-to-many through title_candidates', 'Used when dynamic title tables are unavailable; title_id and candidate_id are foreign keys.'),
])

# Diagram as text
doc.add_heading('2.4 Relationship diagram', level=2)
code('candidates (1) --------< candidate_images\n     |\n     +--------< dynamic title vote table per title\n     |\n     +--------< published_title_results >-------- (1) titles\n\ntitles (1) --------< title_candidates >-------- (1) candidates   [fallback model]\n\nvoter (1) --------< voter_voted_titles\nadmins       independent administrator credentials\nteacher_vote_tokens   independent teacher voting sessions\nelection_settings     singleton-like global election control row')

# API
doc.add_heading('3. API Routes', level=1)
doc.add_paragraph('All routes below are relative to the backend origin. Routes not explicitly permitted by SecurityConfig require authentication. GET title/candidate browsing routes are public; vote routes have their own session checks.')

doc.add_heading('3.1 Authentication and student routes', level=2)
table(['Method and path', 'Purpose', 'Session / authorization'], [
    ('POST /api/auth/login', 'Authenticate an administrator by email or name and password.', 'Creates administrator Spring Security authentication in HttpSession.'),
    ('GET /api/auth/session', 'Return the current administrator identity.', 'Requires an authenticated Spring Security context.'),
    ('POST /api/voters/request-otp', 'Create/update a student voter and send a six-digit Telegram OTP.', 'Public; persists voter and hashed OTP.'),
    ('POST /api/voters/verify-otp', 'Verify the OTP.', 'Public; marks voter verified and stores verifiedStudentId in HttpSession.'),
    ('GET /api/voters/me', 'Return the current student session state.', 'Reads verifiedStudentId from HttpSession.'),
    ('POST /api/voters/logout', 'Invalidate the student HTTP session.', 'Public endpoint; invalidates session.'),
])

doc.add_heading('3.2 Candidate and image routes', level=2)
table(['Method and path', 'Purpose', 'Authorization'], [
    ('GET /api/candidates', 'List candidates, titles, gallery, and per-title vote totals.', 'Public.'),
    ('POST /api/candidates', 'Create a candidate and register it for matching titles.', 'Authenticated.'),
    ('PUT /api/candidates/{id}', 'Update candidate profile/title registration.', 'Authenticated.'),
    ('DELETE /api/candidates/{id}', 'Delete candidate, title rows, gallery records, and stored gallery files.', 'Authenticated.'),
    ('GET /api/candidates/{id}/images', 'List gallery image paths.', 'Public through the candidate GET matcher.'),
    ('POST /api/candidates/{id}/images', 'Add a gallery image.', 'Authenticated.'),
    ('DELETE /api/candidates/{candidateId}/images/{imageId}', 'Delete one gallery image and its stored file.', 'Authenticated.'),
    ('GET /api/candidates_images/{filename}', 'Serve a stored candidate image.', 'Public.'),
    ('PUT /api/title-candidates/{id}/vote', 'Legacy/fallback title-candidate vote increment.', 'Authenticated by general security rules.'),
])

doc.add_heading('3.3 Title, election, result, and voting routes', level=2)
table(['Method and path', 'Purpose', 'Session / authorization'], [
    ('GET /api/titles', 'List configured titles.', 'Public.'),
    ('GET /api/titles/summary', 'Aggregate student, teacher, and total votes.', 'Public.'),
    ('GET /api/titles/totals', 'Vote totals per title.', 'Public.'),
    ('POST /api/titles', 'Create a title and register matching candidates.', 'Authenticated.'),
    ('DELETE /api/titles/{id}', 'Delete a title and its vote table/result data.', 'Authenticated.'),
    ('GET /api/titles/voting-time', 'Read deadline and closed state.', 'Public.'),
    ('PUT /api/titles/voting-time', 'Set or clear deadline and manually close/open voting.', 'Authenticated.'),
    ('GET /api/titles/result-leaders', 'List published title winners.', 'Public.'),
    ('PUT /api/titles/{name}/result-leader', 'Calculate or publish a weighted title winner.', 'Authenticated.'),
    ('DELETE /api/titles/{name}/result-leader', 'Remove a published winner.', 'Authenticated.'),
    ('PUT /api/titles/{name}/candidates/{candidateId}/vote', 'Submit one student vote for a candidate/title.', 'Requires verifiedStudentId in HttpSession and open voting.'),
    ('PUT /api/titles/teacher/{name}/candidates/{candidateId}/vote', 'Submit one teacher vote for a candidate/title.', 'Requires a valid verifiedTeacherToken in HttpSession.'),
    ('PUT /api/titles/teacher/{name}/voteAll', 'Add one teacher vote to every candidate in a title.', 'Requires a valid verifiedTeacherToken.'),
])

doc.add_heading('3.4 Teacher, Telegram, and utility routes', level=2)
table(['Method and path', 'Purpose', 'Session / authorization'], [
    ('POST /api/teacher/token', 'Generate a teacher vote token.', 'Authenticated in normal deployment.'),
    ('POST /api/teacher/verify', 'Verify a teacher token and begin teacher session.', 'Public verification endpoint; stores verifiedTeacherToken in HttpSession.'),
    ('GET /api/teacher/status', 'Return token expiry and voted titles.', 'Requires valid teacher session token.'),
    ('GET /api/teacher/tokens', 'List generated teacher tokens for dashboard.', 'Authenticated.'),
    ('DELETE /api/teacher/tokens/{id}', 'Delete a teacher token.', 'Authenticated.'),
    ('GET /api/telegram/link', 'Create a Telegram link token and return a bot URL.', 'Public; stores telegramLinkToken in HttpSession.'),
    ('GET /api/telegram/launch', 'Create a Telegram link token and redirect to the bot.', 'Public; stores telegramLinkToken in HttpSession.'),
    ('GET /api/telegram/link/status', 'Check whether the current link token has been connected.', 'Public; reads telegramLinkToken from HttpSession.'),
    ('GET /api/test', 'Simple backend test endpoint.', 'Public.'),
])

# Sessions
doc.add_heading('4. Sessions and Authentication State', level=1)
doc.add_paragraph('The application uses servlet HttpSession for browser session state. The code explicitly stores authentication markers as session attributes. The repository does not configure Spring Session JDBC or Redis, so the actual HttpSession storage is the servlet container’s default session mechanism unless deployment configuration changes it.')

doc.add_heading('4.1 Administrator session', level=2)
numbered('The client sends POST /api/auth/login with email or administrator name and password.')
numbered('AuthController looks up the Admin record and verifies the BCrypt password hash.')
numbered('A UsernamePasswordAuthenticationToken is created and placed in a Spring SecurityContext.')
numbered('The SecurityContext is stored in the HttpSession under Spring Security’s SPRING_SECURITY_CONTEXT_KEY.')
numbered('Subsequent protected requests use the session cookie. The browser frontend sends credentials: include.')
code('session attribute: SPRING_SECURITY_CONTEXT_KEY\nauthenticated principal: administrator email')
note('The Admin table stores the credential record; the session stores the logged-in security context, not the password.')


doc.add_heading('4.2 Student session', level=2)
numbered('POST /api/voters/request-otp finds a voter by unique phone number or creates one.')
numbered('The OTP is generated, BCrypt-hashed, and saved to otp_hash with a five-minute otp_expires_at timestamp.')
numbered('TelegramOtpService sends the plain OTP to the configured Telegram chat. The plain OTP is not stored.')
numbered('POST /api/voters/verify-otp validates the hash and expiry, sets verified=true, and clears OTP fields.')
numbered('The session ID is rotated with changeSessionId(), then the voter ID is stored in the session.')
code('session attribute: verifiedStudentId = voter.id')
numbered('Student vote requests read verifiedStudentId, lock the voter row with findByIdForUpdate, check votedTitles, increment the title vote table, and add the normalized title key to voter_voted_titles.')
numbered('has_voted becomes true only when the voter has voted in every configured title.')


doc.add_heading('4.3 Teacher session', level=2)
numbered('The dashboard or administrator generates a teacher token through POST /api/teacher/token.')
numbered('The token record is persisted in teacher_vote_tokens with creation and expiry timestamps.')
numbered('The teacher submits the token to POST /api/teacher/verify.')
numbered('If valid, the raw token is stored in the browser HttpSession.')
code('session attribute: verifiedTeacherToken = token string')
numbered('Teacher vote requests validate the token, reject expired/inactive/used tokens, and record voted title keys in the token’s voted_entries data.')


doc.add_heading('4.4 Telegram linking session', level=2)
numbered('GET /api/telegram/link or /api/telegram/launch creates a short-lived link token through TelegramOtpService.')
numbered('The token is stored in HttpSession as telegramLinkToken.')
numbered('GET /api/telegram/link/status uses that token to ask TelegramOtpService whether a chat ID has been linked.')
code('session attribute: telegramLinkToken = temporary Telegram linking token')

# Storage
doc.add_heading('5. Where Data Is Stored', level=1)
table(['Data', 'Storage location', 'Security note'], [
    ('Admin password', 'admins.password', 'Stored as a BCrypt hash; never place the plain password in a session.'),
    ('Student OTP', 'voter.otp_hash and voter.otp_expires_at', 'Only the hash and expiry are stored; fields are cleared after successful verification.'),
    ('Student identity', 'voter plus HttpSession verifiedStudentId', 'The database is the source of profile/vote state; session links the browser to the voter.'),
    ('Student voted titles', 'voter_voted_titles and in-memory JPA collection', 'One row per voter/title key.'),
    ('Teacher token', 'teacher_vote_tokens plus HttpSession verifiedTeacherToken', 'Database record controls expiry/active/used state; session identifies the current browser.'),
    ('Admin authentication', 'HttpSession Spring Security context', 'No custom database session table is configured.'),
    ('Candidate main photo', 'candidates.photo plus image file when uploaded', 'External URL/data path may also be retained depending on input.'),
    ('Candidate gallery', 'candidate_images plus image files managed by ImageStorageService', 'Delete endpoint removes both database records and stored files.'),
    ('Vote totals', 'Dynamic title vote tables', 'Separate student_votes and teacher_votes counters per title/candidate.'),
    ('Election deadline', 'election_settings', 'Global voting_closed and voting_deadline values.'),
])

# Flows
doc.add_heading('6. Important Request Flows', level=1)
doc.add_heading('6.1 Student voting flow', level=2)
code('request OTP -> voter row created/updated -> OTP hash stored -> Telegram delivery\nverify OTP -> voter.verified=true -> session.verifiedStudentId set\nload titles/candidates -> student selects a title/candidate\nPUT vote -> deadline check -> session check -> duplicate-title check\n          -> increment <title_table>.student_votes\n          -> add normalized title key to voter_voted_titles\n          -> update voter.has_voted when all titles are complete')

doc.add_heading('6.2 Admin candidate flow', level=2)
code('admin login -> Spring Security context stored in HttpSession\nPOST candidate -> candidates row -> matching dynamic title rows\nPOST gallery image -> candidate_images row + stored image file\nDELETE candidate -> delete gallery rows/files -> remove title rows -> delete candidate')

doc.add_heading('6.3 Teacher voting flow', level=2)
code('generate token -> teacher_vote_tokens row\nverify token -> session.verifiedTeacherToken\nPUT teacher vote -> validate token -> check token voted_entries\n                     -> increment <title_table>.teacher_votes\n                     -> mark title as voted for this token')

# operational
doc.add_heading('7. Operational and Maintenance Notes', level=1)
bullet('Run Flyway migrations in order. V1 creates the core schema and initial title tables; later migrations add candidate gallery support, published results, and election settings.')
bullet('Dynamic title tables require safe title-name normalization. Renaming a title should be treated carefully because the physical table name is derived from the title name.')
bullet('The current delete implementation explicitly removes candidate gallery records before deleting the candidate to avoid foreign-key failures.')
bullet('For production, configure a persistent HttpSession store such as Spring Session JDBC or Redis if sessions must survive application restarts or be shared across multiple backend instances.')
bullet('Use HTTPS in production so session cookies and OTP-related requests are protected in transit.')
bullet('Keep CORS allowed origins restricted to the deployed frontend origins.')
bullet('Do not expose admin-only POST, PUT, and DELETE routes without an authenticated Spring Security context.')

# Source references
doc.add_heading('8. Source References', level=1)
refs = [
    'backend/Gp3/src/main/resources/db/migration/V1__init_schema_and_data.sql',
    'backend/Gp3/src/main/resources/db/migration/V3__create_published_title_results.sql',
    'backend/Gp3/src/main/resources/db/migration/V5__create_election_settings.sql',
    'backend/Gp3/src/main/java/com/voting/Gp3/controller/AuthController.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/controller/VoterController.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/controller/CandidateController.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/controller/TitleController.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/controller/TeacherTokenController.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/controller/TelegramController.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/service/TitleTableService.java',
    'backend/Gp3/src/main/java/com/voting/Gp3/config/SecurityConfig.java',
]
for ref in refs:
    bullet(ref)

# Footer
for sec in doc.sections:
    footer = sec.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    footer.add_run('Voting System Technical Documentation').font.size = Pt(8)

doc.save(OUTPUT)
print(OUTPUT)
