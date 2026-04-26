# Jenkins Learning Summary

## המטרה

המטרה שלי בלימוד Jenkins היא להבין איך נראה תהליך CI/CD אמיתי: איך לוקחים קוד, מריצים עליו בדיקות, בונים ממנו תוצר, שומרים את התוצר, ובמקרים מסוימים גם פורסים אותו לסביבה כמו dev, staging או production.

הרעיון המרכזי שהבנתי:

```text
Jenkins לא מחליף את Git, Docker, npm, Maven או Kubernetes.
Jenkins מתזמן ומנהל את השלבים שמרכיבים את תהליך הפיתוח וההפצה.
```

במקום שמפתח יריץ ידנית פקודות כמו build, test ו-deploy, Jenkins מריץ אותן בצורה קבועה, מתועדת וחוזרת על עצמה.

## איך הרצתי Jenkins

הרצתי Jenkins מקומית באמצעות Docker.

זה חשוב כי Jenkins עצמו רץ בתוך container, ולכן הפקודות שהרצתי מתוך pipeline, למשל `sh`, רצו בתוך סביבת Linux של ה-container ולא ישירות על Windows.

מזה למדתי את ההבדל בין:

```text
המחשב שלי
Jenkins Controller
Jenkins Agent
Jenkins Workspace
```

בתרגול שלי, Jenkins שימש גם כ-controller וגם כ-agent.

## מושגים בסיסיים שלמדתי

### Job

משימה ב-Jenkins. למשל pipeline שבונה, בודק או פורס אפליקציה.

### Build

הרצה אחת של Job. כל פעם שלוחצים Build Now נוצרת הרצה חדשה עם מספר build משלה.

### Workspace

תיקייה ש-Jenkins יוצר עבור העבודה של ה-build. שם נמצאים הקבצים שה-pipeline יוצר או מוריד.

### Agent

המכונה או ה-container שעליהם הפקודות באמת רצות.

### Pipeline

תהליך אוטומטי שמורכב משלבים כמו:

```text
Checkout -> Build -> Test -> Package -> Deploy
```

## Declarative Pipeline

כתבתי pipeline בסיסי במבנה כזה:

```groovy
pipeline {
    agent any

    stages {
        stage('Build') {
            steps {
                echo 'Building...'
            }
        }
    }
}
```

המשמעות:

- `pipeline` מגדיר את כל תהליך ה-CI/CD.
- `agent any` אומר ל-Jenkins להריץ את התהליך על agent זמין.
- `stages` מכיל את שלבי העבודה.
- `stage` הוא שלב אחד ברור בתהליך.
- `steps` הן הפעולות שרצות בתוך השלב.
- `echo` מדפיס הודעה ללוג של Jenkins.

## למה מחלקים ל-stages

מחלקים את התהליך לשלבים כדי לקבל שליטה וראות.

אם משהו נכשל, אפשר להבין איפה:

```text
Build failed
Test failed
Package failed
Deploy failed
```

זה עדיף על סקריפט אחד גדול שבו קשה לדעת מה בדיוק נשבר.

## הרצת פקודות Shell

הרצתי פקודות כמו:

```groovy
sh 'whoami'
sh 'pwd'
sh 'ls -la'
sh 'java -version'
```

מזה למדתי ש-Jenkins יכול להריץ פקודות אמיתיות על ה-agent.

הפקודות האלה עזרו להבין:

- תחת איזה user Jenkins רץ.
- באיזו תיקייה ה-build רץ.
- אילו קבצים קיימים ב-workspace.
- איזו סביבת runtime קיימת בתוך ה-container.

## כישלון של Build ו-Exit Codes

הרצתי בכוונה:

```groovy
sh 'exit 1'
```

מזה למדתי ש-Jenkins קובע הצלחה או כישלון לפי exit code:

```text
exit code 0 = success
exit code שאינו 0 = failure
```

זה חשוב כי כלי בדיקות, build scripts וכלי deployment משתמשים באותו עיקרון.

לדוגמה:

```text
npm test נכשל -> Jenkins מסמן את ה-build כ-failed
docker build נכשל -> Jenkins מסמן את ה-build כ-failed
```

## Post Actions

למדתי להשתמש ב-`post`:

```groovy
post {
    always {
        echo 'This always runs'
    }

    success {
        echo 'Pipeline succeeded'
    }

    failure {
        echo 'Pipeline failed'
    }
}
```

המטרה של `post` היא להריץ פעולות אחרי סיום ה-stages.

זה שימושי עבור:

- ניקוי workspace.
- שליחת הודעות.
- שמירת artifacts.
- פרסום test reports.
- פעולות שצריכות לרוץ גם אם build נכשל.

הבנתי ש-`always` חשוב במיוחד כי גם אם הבדיקות נכשלות, עדיין נרצה לאסוף את תוצאות הבדיקות ולראות אותן ב-Jenkins.

## Artifacts

יצרתי artifact מזויף:

```groovy
sh 'mkdir -p build'
sh 'echo "version=1.0.${BUILD_NUMBER}" > build/app.txt'
sh 'tar -czf build/app.tar.gz build/app.txt'
```

ואז שמרתי אותו ב-Jenkins:

```groovy
archiveArtifacts artifacts: 'build/*.tar.gz', fingerprint: true
```

Artifact הוא תוצר של build.

דוגמאות אמיתיות:

- קובץ `.jar`
- קובץ `.zip`
- תיקיית `dist`
- קובץ התקנה
- package
- לוגים
- קובץ שמכיל version

המטרה היא שאחרי שה-build הסתיים, יהיה אפשר לראות מה הוא יצר ולהוריד את התוצרים.

`fingerprint: true` מאפשר ל-Jenkins לחשב hash לתוצר, כדי שיהיה אפשר לעקוב מאיזה build הוא הגיע.

## Test Reports

יצרתי קובץ JUnit XML מזויף:

```xml
<testsuite name="demo-tests" tests="2" failures="0">
  <testcase classname="AppTest" name="shouldStart"/>
  <testcase classname="AppTest" name="shouldReturnOk"/>
</testsuite>
```

ואז פרסמתי אותו ב-Jenkins:

```groovy
junit 'test-results/*.xml'
```

Jenkins קרא את הקובץ והציג בדף הבדיקות ששתי בדיקות עברו.

הבנתי שבפרויקט אמיתי אני לא אמור לכתוב XML כזה ידנית. כלי הבדיקות מייצר אותו.

לדוגמה:

```text
npm test
mvn test
dotnet test
pytest
```

ואז Jenkins רק אוסף ומציג את התוצאות.

## Jenkinsfile ו-Pipeline as Code

יצרתי מבנה פרויקט קטן:

```text
demo-app/
  Jenkinsfile
  package.json
  src/
    app.js
```

בתוך ה-`Jenkinsfile` שמתי pipeline עם שלבים כמו Install ו-Test.

הבנתי שכרגע בתרגול שלי ה-pipeline עדיין רץ מתוך ה-UI של Jenkins, אבל בעולם אמיתי עדיף לשמור את ה-pipeline בתוך repository כקובץ `Jenkinsfile`.

למה זה חשוב:

- ה-pipeline נשמר ב-Git.
- אפשר לעשות עליו code review.
- אפשר לראות היסטוריה של שינויים.
- ה-build logic נמצא ליד הקוד.
- קל יותר לשחזר Jenkins job.

משפט טוב לראיון:

```text
Jenkinsfile מאפשר לנהל את תהליך ה-CI/CD כקוד, עם version control ו-code review.
```

## Parameters

הוספתי parameters ל-pipeline:

```groovy
parameters {
    choice(
        name: 'ENVIRONMENT',
        choices: ['dev', 'staging', 'prod'],
        description: 'Where should we deploy?'
    )

    booleanParam(
        name: 'RUN_TESTS',
        defaultValue: true,
        description: 'Should tests run?'
    )

    string(
        name: 'VERSION',
        defaultValue: '1.0.0',
        description: 'Application version'
    )
}
```

מזה למדתי ש-Jenkins job יכול לקבל קלט מהמשתמש בזמן הרצה.

לדוגמה:

- לאיזו סביבה לפרוס.
- האם להריץ בדיקות.
- איזו גרסה לבנות.

אחרי שהוספתי parameters, הופיע כפתור:

```text
Build with Parameters
```

## Conditional Stages

השתמשתי ב-`when` כדי לדלג על stage:

```groovy
stage('Test') {
    when {
        expression {
            return params.RUN_TESTS
        }
    }

    steps {
        echo 'Running tests...'
    }
}
```

כאשר `RUN_TESTS` היה false, Jenkins דילג לגמרי על שלב הבדיקות.

זה מדמה מצב אמיתי שבו יש שלבים שרצים רק בתנאים מסוימים.

דוגמאות:

```text
להריץ deploy רק מ-main branch
להריץ בדיקות כבדות רק בלילה
לפרוס production רק אם נבחרה סביבה prod
```

## Manual Approval Gate

הוספתי אישור ידני לפני production:

```groovy
script {
    if (params.ENVIRONMENT == 'prod') {
        input message: "Deploy ${APP_NAME} version ${params.VERSION} to production?"
    }
}
```

כאשר בחרתי `prod`, Jenkins עצר את ה-pipeline וחיכה לאישור.

בממשק ראיתי שה-build במצב paused for input, ואז אישרתי והוא המשיך.

הבנתי שזה שימושי לפני פעולות רגישות כמו:

- production deploy
- migration למסד נתונים
- מחיקת משאבים
- promotion של Docker image
- restart לשירותים

משפט טוב לראיון:

```text
אפשר להגן על production deployments באמצעות input step, הרשאות Jenkins, credentials מוגבלים, ו-branch rules.
```

## Credentials

יצרתי credential מזויף מסוג Secret Text:

```text
ID: demo-token
Secret: fake-super-secret-token-123
```

ואז השתמשתי בו ב-pipeline:

```groovy
withCredentials([
    string(credentialsId: 'demo-token', variable: 'TOKEN')
]) {
    sh 'echo "Token is: $TOKEN"'
}
```

Jenkins הציג את הסוד בלוג כ:

```text
****
```

מזה למדתי שלא שמים סודות ישירות בתוך Jenkinsfile.

דוגמה גרועה:

```groovy
sh 'docker login -u myuser -p mypassword'
```

דוגמה נכונה:

```groovy
withCredentials([
    usernamePassword(
        credentialsId: 'docker-registry',
        usernameVariable: 'REGISTRY_USER',
        passwordVariable: 'REGISTRY_PASS'
    )
]) {
    sh 'echo "$REGISTRY_PASS" | docker login -u "$REGISTRY_USER" --password-stdin'
}
```

הבנתי ש-`withCredentials` מקבל array כי לפעמים צריך כמה credentials באותו block.

לדוגמה:

```text
Docker registry credentials
Cloud provider token
Git SSH key
API token
```

## Groovy Sandbox

ראיתי checkbox של Groovy Sandbox.

הבנתי ש-Jenkins pipelines כתובים ב-Groovy, ו-Groovy יכולה לעשות פעולות חזקות מאוד.

ה-Sandbox מגביל את מה שה-script יכול לעשות כדי להגן על Jenkins.

אם מורידים את ה-Sandbox, Jenkins עשוי לדרוש אישור admin עבור פעולות מסוימות.

משפט טוב לראיון:

```text
Groovy Sandbox מגביל pipeline scripts כדי למנוע פעולות לא בטוחות, במיוחד כשלאדמינים ולא-אדמינים יש גישה לכתיבת pipelines.
```

## מה למדתי להסביר ברמה מקצועית

Jenkins הוא כלי שמאפשר להפוך תהליך ידני לתהליך אוטומטי, חוזר וברור.

במקום שמישהו יריץ ידנית:

```text
pull
install
test
build
package
deploy
```

מגדירים pipeline שמריץ את אותם שלבים בצורה קבועה.

היתרונות:

- פחות טעויות אנוש.
- קל לראות איפה תהליך נכשל.
- כל build מתועד.
- אפשר לשמור artifacts.
- אפשר לפרסם test reports.
- אפשר לנהל secrets בצורה בטוחה.
- אפשר להוסיף approvals ל-production.
- אפשר להריץ אותו תהליך לכל שינוי בקוד.

## סיכום קצר שאני יכול להגיד בראיון

```text
הרצתי Jenkins מקומית עם Docker ותרגלתי Declarative Pipelines.
עבדתי עם stages, shell steps, post actions, artifacts, JUnit test reports,
parameters, conditional stages, manual approval gates ו-Jenkins credentials.

אני מבין ש-Jenkins משמש לאוטומציה של CI/CD:
לקחת קוד, לבנות אותו, להריץ בדיקות, לארוז תוצרים, ובמקרה הצורך לפרוס אותם.

אני גם מבין את החשיבות של Jenkinsfile כ-Pipeline as Code,
ושסודות לא צריכים להיות hardcoded אלא מנוהלים דרך Jenkins Credentials.
```

## איך אני רואה את זה עכשיו

Jenkins הוא לא רק "כלי שמריץ סקריפטים".

הוא דרך להפוך תהליך software delivery לתהליך:

```text
ברור
חוזר על עצמו
מדיד
מבוקר
ניתן לדיבוג
בטוח יותר
```

וזה בדיוק אחד התפקידים המרכזיים של DevOps: לקחת תהליך שעבד ידנית או בצורה לא יציבה, ולהפוך אותו לתהליך אוטומטי, אמין ובר-תחזוקה.

