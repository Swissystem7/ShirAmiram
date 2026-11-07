# Python builder for authentic Amiram Restatement questions bank
import json
from pathlib import Path

RESTATEMENTS = [
    # --- Level A (Foundational Grammar & Connectors) ---
    {
        "id": 1,
        "difficulty": "A_foundational",
        "grammar_target": "concession_contrast",
        "source_sentence": "Although the weather was harsh and rainy, the marathon runners finished the race.",
        "options": [
            {"text": "The marathon runners completed the race despite the bad and rainy weather.", "is_correct": True, "error_type": None},
            {"text": "The marathon runners could not finish the race because of the harsh rain.", "is_correct": False, "error_type": "reversed_meaning"},
            {"text": "Because the weather was harsh and rainy, the marathon was canceled.", "is_correct": False, "error_type": "unsupported_fact"},
            {"text": "The marathon runners will finish the race if the weather improves.", "is_correct": False, "error_type": "tense_condition_error"}
        ],
        "explanation_he": "המילה Although מבטאת ויתור וניגוד (Concession). האפשרות הנכונה משתמשת ב-despite כדי להביע את אותה המשמעות בדיוק: הרצים סיימו את המרוץ למרות מזג האוויר הקשה."
    },
    {
        "id": 2,
        "difficulty": "A_foundational",
        "grammar_target": "cause_effect",
        "source_sentence": "Due to a technical failure in the computer network, the library was forced to close early.",
        "options": [
            {"text": "The library closed earlier than usual because of a network technical issue.", "is_correct": True, "error_type": None},
            {"text": "The library closed early so that technicians could upgrade the computers.", "is_correct": False, "error_type": "purpose_error"},
            {"text": "A network failure occurred after the library closed its doors.", "is_correct": False, "error_type": "time_order_error"},
            {"text": "The library remained open despite persistent technical failures.", "is_correct": False, "error_type": "opposite_meaning"}
        ],
        "explanation_he": "הביטוי Due to מציין סיבה ותוצאה (Cause & Effect). התחליף המדויק הוא because of. שאר המסיחים משנים את סדר הזמנים או את העובדות."
    },
    {
        "id": 3,
        "difficulty": "A_foundational",
        "grammar_target": "comparison",
        "source_sentence": "Electric vehicles are considerably quieter than traditional gasoline-powered cars.",
        "options": [
            {"text": "Cars that run on gasoline produce significantly more noise than electric cars.", "is_correct": True, "error_type": None},
            {"text": "Electric cars make just as much noise as traditional cars.", "is_correct": False, "error_type": "false_equality"},
            {"text": "Traditional gasoline cars are slightly quieter than electric vehicles.", "is_correct": False, "error_type": "reversed_comparison"},
            {"text": "Electric cars are popular because they are completely silent.", "is_correct": False, "error_type": "unsupported_reason"}
        ],
        "explanation_he": "המשפט המקורי משווה רעש: רכבים חשמליים שקטים בהרבה מרכבי בנזין. האפשרות הנכונה מנסחת את אותו יחס מהכיוון ההפוך: רכבי בנזין מרעישים משמעותית יותר."
    },
    {
        "id": 4,
        "difficulty": "A_foundational",
        "grammar_target": "condition_negation",
        "source_sentence": "Unless you submit your application before Friday, you will not be admitted to the course.",
        "options": [
            {"text": "You can only be accepted into the course if you hand in your application prior to Friday.", "is_correct": True, "error_type": None},
            {"text": "If you submit your application on Friday, admission is guaranteed.", "is_correct": False, "error_type": "false_guarantee"},
            {"text": "You will be accepted into the course even without submitting an application.", "is_correct": False, "error_type": "negation_drop"},
            {"text": "The course was canceled because applications were submitted after Friday.", "is_correct": False, "error_type": "tense_fact_error"}
        ],
        "explanation_he": "המילית Unless שקולה ל-if not (אלא אם כן). לכן, הדרך היחידה להתקבל היא הגשת הבקשה לפני יום שישי."
    },
    {
        "id": 5,
        "difficulty": "A_foundational",
        "grammar_target": "preference_choice",
        "source_sentence": "Dr. Miller prefers reading printed books to reading on digital screens.",
        "options": [
            {"text": "Dr. Miller would rather read paper books than read from electronic devices.", "is_correct": True, "error_type": None},
            {"text": "Dr. Miller enjoys reading on digital screens more than reading printed books.", "is_correct": False, "error_type": "reversed_preference"},
            {"text": "Dr. Miller exclusively reads printed books and never touches a screen.", "is_correct": False, "error_type": "extreme_generalization"},
            {"text": "Dr. Miller advised his students to avoid digital reading screens.", "is_correct": False, "error_type": "unsupported_fact"}
        ],
        "explanation_he": "המבנה prefer X to Y מקביל תחבירית וסמנטית ל-would rather X than Y (מעדיף את X על פני Y)."
    },
    {
        "id": 6,
        "difficulty": "A_foundational",
        "grammar_target": "passive_active",
        "source_sentence": "The ancient palace was restored by a renowned team of European architects.",
        "options": [
            {"text": "A famous team of architects from Europe restored the old palace.", "is_correct": True, "error_type": None},
            {"text": "The European architects built an entirely new palace near the old one.", "is_correct": False, "error_type": "lexical_distortion"},
            {"text": "The ancient palace was damaged while architects were attempting to restore it.", "is_correct": False, "error_type": "opposite_fact"},
            {"text": "Architects from Europe are currently planning to restore the ancient palace.", "is_correct": False, "error_type": "tense_error"}
        ],
        "explanation_he": "הפיכה מסביל לפעיל (Passive to Active): המבנה was restored by הופך לפועל פעיל restored על ידי הנושא מהאירופה, תוך שמירה על זמן עבר ומשמעות זהה."
    },
    {
        "id": 7,
        "difficulty": "A_foundational",
        "grammar_target": "time_sequence",
        "source_sentence": "Prior to joining the university faculty, Professor Cohen worked at a research laboratory.",
        "options": [
            {"text": "Before Professor Cohen became a faculty member at the university, he worked in a laboratory.", "is_correct": True, "error_type": None},
            {"text": "Professor Cohen left the university in order to begin working at a research laboratory.", "is_correct": False, "error_type": "reversed_chronology"},
            {"text": "While working at the university, Professor Cohen managed a private laboratory.", "is_correct": False, "error_type": "simultaneous_distortion"},
            {"text": "Professor Cohen never worked at a university before joining the laboratory.", "is_correct": False, "error_type": "inverted_places"}
        ],
        "explanation_he": "הביטוי Prior to משמעותו Before (לפני). כרונולוגיית האירועים נשמרת: תחילה המעבדה, ורק לאחר מכן האוניברסיטה."
    },
    {
        "id": 8,
        "difficulty": "A_foundational",
        "grammar_target": "concession_contrast",
        "source_sentence": "In spite of her lack of formal training, Maya demonstrated outstanding musical talent.",
        "options": [
            {"text": "Maya showed exceptional musical ability even though she had no formal education in music.", "is_correct": True, "error_type": None},
            {"text": "Because Maya was formally trained, she exhibited remarkable musical gifts.", "is_correct": False, "error_type": "connector_cause_swap"},
            {"text": "Maya failed to develop her musical talent due to a lack of proper coaching.", "is_correct": False, "error_type": "opposite_outcome"},
            {"text": "Formal musical training helped Maya overcome her lack of natural talent.", "is_correct": False, "error_type": "inverted_premises"}
        ],
        "explanation_he": "In spite of שקול ל-even though (למרות / אף על פי ש-). המילה talent מקבילה ל-ability."
    },
    {
        "id": 9,
        "difficulty": "A_foundational",
        "grammar_target": "prohibition_permission",
        "source_sentence": "Visitors are strictly forbidden from taking photographs inside the art gallery.",
        "options": [
            {"text": "Taking pictures within the art gallery is not permitted under any circumstances.", "is_correct": True, "error_type": None},
            {"text": "Visitors may photograph artwork in the gallery as long as they turn off the flash.", "is_correct": False, "error_type": "false_condition"},
            {"text": "The gallery allows visitors to photograph certain designated exhibits.", "is_correct": False, "error_type": "permission_error"},
            {"text": "Visitors must take photographs of all art pieces during their tour.", "is_correct": False, "error_type": "obligation_error"}
        ],
        "explanation_he": "strictly forbidden (אסור בהחלט) שקול ל-is not permitted (אינו מורשה)."
    },
    {
        "id": 10,
        "difficulty": "A_foundational",
        "grammar_target": "cause_effect",
        "source_sentence": "Owing to heavy traffic on the highway, we arrived twenty minutes after the concert began.",
        "options": [
            {"text": "We were twenty minutes late for the start of the concert because highway traffic was heavy.", "is_correct": True, "error_type": None},
            {"text": "The concert was delayed for twenty minutes until traffic on the highway cleared.", "is_correct": False, "error_type": "subject_swap"},
            {"text": "We avoided the highway traffic and arrived twenty minutes before the concert.", "is_correct": False, "error_type": "opposite_fact"},
            {"text": "Traffic on the highway was caused by people traveling to the concert.", "is_correct": False, "error_type": "spurious_cause"}
        ],
        "explanation_he": "Owing to מציין סיבה (בשל/עקב). עשרים דקות לאחר שהקונצרט החל משמעותו איחור של 20 דקות."
    },

    # --- Level B (Intermediate Syntax & Conditionals) ---
    {
        "id": 11,
        "difficulty": "B_intermediate",
        "grammar_target": "hypothetical_conditional",
        "source_sentence": "Had the engineers inspected the bridge thoroughly, they would have detected the structural cracks.",
        "options": [
            {"text": "The structural cracks went unnoticed because the engineers did not inspect the bridge carefully.", "is_correct": True, "error_type": None},
            {"text": "The engineers noticed the cracks immediately after completing a thorough inspection.", "is_correct": False, "error_type": "opposite_fact"},
            {"text": "If the bridge cracks are inspected, engineers will repair them promptly.", "is_correct": False, "error_type": "tense_hypothetical_loss"},
            {"text": "Although the engineers inspected the bridge, they could not prevent the cracks from forming.", "is_correct": False, "error_type": "concession_distortion"}
        ],
        "explanation_he": "משפט תנאי בטל (Third Conditional Inversion): המבנה Had they inspected שקול ל-If they had inspected. המשמעות בפועל: המהנדסים לא בדקו היטב, ולכן הסדקים לא התגלו."
    },
    {
        "id": 12,
        "difficulty": "B_intermediate",
        "grammar_target": "limiting_adverbs",
        "source_sentence": "Hardly had the keynote speaker stepped onto the stage when the fire alarm sounded.",
        "options": [
            {"text": "The fire alarm went off almost immediately after the speaker walked onto the stage.", "is_correct": True, "error_type": None},
            {"text": "The keynote speaker refused to step onto the stage until the fire alarm was silenced.", "is_correct": False, "error_type": "temporal_swap"},
            {"text": "The fire alarm had been ringing long before the keynote speaker arrived at the venue.", "is_correct": False, "error_type": "duration_error"},
            {"text": "Whenever the speaker stepped onto a stage, false fire alarms were triggered.", "is_correct": False, "error_type": "habitual_distortion"}
        ],
        "explanation_he": "המבנה Hardly... when מציין שני אירועים שהתרחשו בהפרש זמנים אפסי (כמעט מיד לאחר ש-)."
    },
    {
        "id": 13,
        "difficulty": "B_intermediate",
        "grammar_target": "exclusivity_condition",
        "source_sentence": "Only by investing in renewable energy sources can developing nations reduce long-term carbon emissions.",
        "options": [
            {"text": "Developing countries will not be able to lower carbon emissions in the long run without renewable energy investments.", "is_correct": True, "error_type": None},
            {"text": "Developing nations have already reduced their carbon emissions by adopting renewable energy.", "is_correct": False, "error_type": "past_factual_error"},
            {"text": "Renewable energy is one of several equally effective methods to curb emissions in developing nations.", "is_correct": False, "error_type": "diluted_exclusivity"},
            {"text": "Investing in renewable energy will immediately eliminate all industrial emissions in developing nations.", "is_correct": False, "error_type": "exaggeration"}
        ],
        "explanation_he": "המבנה Inversion עם Only by (רק באמצעות X ניתן Y) מציב תנאי הכרחי בלעדי. האפשרות הנכונה מנסחת זאת בשלילה כפולה: לא ניתן להפחית ללא השקעה באנרגיה מתחדשת."
    },
    {
        "id": 14,
        "difficulty": "B_intermediate",
        "grammar_target": "concession_contrast",
        "source_sentence": "Much as the committee appreciated the proposal's creativity, they ultimately rejected it for budgetary reasons.",
        "options": [
            {"text": "Even though the committee valued how creative the proposal was, financial constraints caused them to decline it.", "is_correct": True, "error_type": None},
            {"text": "Because the proposal was deemed insufficiently creative, the committee cut its budget.", "is_correct": False, "error_type": "causal_distortion"},
            {"text": "The committee accepted the proposal primarily because of its exceptional artistic creativity.", "is_correct": False, "error_type": "direct_contradiction"},
            {"text": "The committee requested a larger budget before evaluating the proposal's creative merits.", "is_correct": False, "error_type": "timeline_shift"}
        ],
        "explanation_he": "המבנה Much as S+V הוא תבנית ויתור מתקדמת שמשמעותה למרות ש- / כמה שהוועדה העריכה (Even though). budgetary reasons = financial constraints (אילוצי תקציב)."
    },
    {
        "id": 15,
        "difficulty": "B_intermediate",
        "grammar_target": "negative_correlation",
        "source_sentence": "Neither the manager nor her assistants were aware of the security breach until the audit was published.",
        "options": [
            {"text": "Both the manager and her assistants learned of the security breach only after the audit came out.", "is_correct": True, "error_type": None},
            {"text": "The manager discovered the breach during the audit, but her assistants remained uninformed.", "is_correct": False, "error_type": "partial_asymmetry"},
            {"text": "Either the manager or her assistants was responsible for exposing the security breach.", "is_correct": False, "error_type": "culpability_error"},
            {"text": "The security audit was delayed because neither the manager nor her team cooperated.", "is_correct": False, "error_type": "unsupported_narrative"}
        ],
        "explanation_he": "Neither... nor שולל את שניהם במקביל. המשמעות: איש מהם לא ידע על הפריצה עד פרסום הביקורת, כלומר שניהם גילו זאת רק לאחריה."
    },
    {
        "id": 16,
        "difficulty": "B_intermediate",
        "grammar_target": "proportionate_change",
        "source_sentence": "The more frequently employees exercise throughout the week, the less stress they tend to report at work.",
        "options": [
            {"text": "Increased weekly exercise among workers is associated with lower levels of job-related stress.", "is_correct": True, "error_type": None},
            {"text": "Employees who experience stress at work are encouraged to exercise more often.", "is_correct": False, "error_type": "recommendation_shift"},
            {"text": "Frequent exercise at work causes employees to neglect their workplace responsibilities.", "is_correct": False, "error_type": "spurious_outcome"},
            {"text": "Workplace stress increases steadily as employees spend more hours exercising.", "is_correct": False, "error_type": "inverted_correlation"}
        ],
        "explanation_he": "מבנה The more... the less מתאר יחס הפוך: ככל שמתעמלים יותר, מדווחים על פחות מתח (מתאם הפוך בין פעילות לרמות סטרס בעבודה)."
    },
    {
        "id": 17,
        "difficulty": "B_intermediate",
        "grammar_target": "modals_speculation",
        "source_sentence": "The archeologist couldn't have identified the artifact without consulting the ancient manuscript.",
        "options": [
            {"text": "Consulting the ancient manuscript was essential for the archeologist to determine what the artifact was.", "is_correct": True, "error_type": None},
            {"text": "The archeologist refused to inspect the manuscript despite discovering the artifact.", "is_correct": False, "error_type": "factual_inversion"},
            {"text": "Even after reading the ancient manuscript, the archeologist failed to identify the artifact.", "is_correct": False, "error_type": "failure_distortion"},
            {"text": "The artifact was found buried alongside an ancient, unidentified manuscript.", "is_correct": False, "error_type": "location_distortion"}
        ],
        "explanation_he": "המבנה couldn't have done X without Y מעיד כי Y היה תנאי הכרחי (essential) לזיהוי."
    },
    {
        "id": 18,
        "difficulty": "B_intermediate",
        "grammar_target": "contrast_balance",
        "source_sentence": "While Sarah excels in analytical mathematics, her brother displays a profound aptitude for literature.",
        "options": [
            {"text": "Sarah is talented in math, whereas her brother has a strong natural gift for literary studies.", "is_correct": True, "error_type": None},
            {"text": "Sarah and her brother both struggle with analytical mathematics and literature.", "is_correct": False, "error_type": "shared_weakness"},
            {"text": "Sarah's proficiency in mathematics surpassed her brother's literary achievements.", "is_correct": False, "error_type": "hierarchy_error"},
            {"text": "Because Sarah excelled in math, her brother decided to pursue literature instead.", "is_correct": False, "error_type": "causal_fabrication"}
        ],
        "explanation_he": "המילה While משמשת להבעת ניגוד ענייני (whereas / בעוד ש-). aptitude שקול ל-natural gift."
    },
    {
        "id": 19,
        "difficulty": "B_intermediate",
        "grammar_target": "consequence_inevitability",
        "source_sentence": "Failure to address the software vulnerability will inevitably expose sensitive user credentials.",
        "options": [
            {"text": "If the software security flaw is left unresolved, confidential user data is certain to be compromised.", "is_correct": True, "error_type": None},
            {"text": "Addressing the vulnerability early helped prevent any user credentials from being leaked.", "is_correct": False, "error_type": "past_success_error"},
            {"text": "User credentials were lost before developers became aware of the software bug.", "is_correct": False, "error_type": "timeline_error"},
            {"text": "The vulnerability poses a minor risk that is unlikely to affect regular users.", "is_correct": False, "error_type": "minimization"}
        ],
        "explanation_he": "Failure to address = if left unresolved (אי טיפול). inevitably = certain to (באופן בלתי נמנע). sensitive credentials = confidential data."
    },
    {
        "id": 20,
        "difficulty": "B_intermediate",
        "grammar_target": "counterfactual_wishes",
        "source_sentence": "The government regrets not implementing stringent emission caps earlier in the decade.",
        "options": [
            {"text": "The government wishes it had enacted strict pollution limits sooner.", "is_correct": True, "error_type": None},
            {"text": "The government repealed the emission caps it had introduced earlier in the decade.", "is_correct": False, "error_type": "repeal_distortion"},
            {"text": "Earlier implementation of emission caps caused the government substantial political harm.", "is_correct": False, "error_type": "harm_fabrication"},
            {"text": "The government plans to lift all emission regulations before the decade concludes.", "is_correct": False, "error_type": "future_opposite"}
        ],
        "explanation_he": "המבנה regrets not doing X שקול ל-wishes it had done X (מתחרטת שלא עשתה = מביעה משאלה שהייתה עושה מוקדם יותר)."
    },

    # --- Level C (Advanced Inversion, Subjunctive & Academic Nuance) ---
    {
        "id": 21,
        "difficulty": "C_advanced",
        "grammar_target": "negative_inversion",
        "source_sentence": "Seldom has a scientific breakthrough generated such widespread debate across both academic and political spheres.",
        "options": [
            {"text": "Rarely has any scientific discovery sparked as much controversy among scholars and policymakers alike.", "is_correct": True, "error_type": None},
            {"text": "Scientific breakthroughs are frequently ignored by political and academic institutions.", "is_correct": False, "error_type": "broad_generalization"},
            {"text": "Scholars and politicians unanimously endorsed the revolutionary scientific breakthrough.", "is_correct": False, "error_type": "consensus_error"},
            {"text": "Debates concerning scientific breakthroughs rarely influence academic or political policies.", "is_correct": False, "error_type": "influence_shift"}
        ],
        "explanation_he": "Seldom has... שקול ל-Rarely has... (לעיתים רחוקות מאוד). generated debate מקביל ל-sparked controversy. academic and political spheres מקביל ל-scholars and policymakers alike."
    },
    {
        "id": 22,
        "difficulty": "C_advanced",
        "grammar_target": "unfulfilled_expectation",
        "source_sentence": "Far from being a mere decorative enhancement, the facade plays a pivotal role in the building's thermal insulation.",
        "options": [
            {"text": "Rather than serving only an aesthetic purpose, the building's exterior is crucial for temperature regulation.", "is_correct": True, "error_type": None},
            {"text": "The building's thermal insulation was compromised because architects focused solely on decoration.", "is_correct": False, "error_type": "compromised_error"},
            {"text": "The facade serves an exclusively decorative role with negligible impact on thermal efficiency.", "is_correct": False, "error_type": "direct_opposite"},
            {"text": "Engineers recommended removing the facade to improve internal temperature regulation.", "is_correct": False, "error_type": "removal_fabrication"}
        ],
        "explanation_he": "הביטוי Far from being X שולל לחלוטין את היות הדבר X בלבד ומדגיש את תפקידו המרכזי ב-Y (Rather than serving only an aesthetic purpose... crucial for temperature regulation)."
    },
    {
        "id": 23,
        "difficulty": "C_advanced",
        "grammar_target": "hypothetical_inversion",
        "source_sentence": "Were it not for the unprecedented drought, agricultural yields across the province would have met historical benchmarks.",
        "options": [
            {"text": "The province's farming output fell below normal levels solely because of an extraordinary dry spell.", "is_correct": True, "error_type": None},
            {"text": "Agricultural yields exceeded expectations despite the prolonged drought.", "is_correct": False, "error_type": "exceeded_error"},
            {"text": "Farmers anticipated the drought and took measures to maintain historical harvest levels.", "is_correct": False, "error_type": "adaptation_fabrication"},
            {"text": "Historical benchmarks indicate that drought has little effect on provincial agricultural yields.", "is_correct": False, "error_type": "minimization"}
        ],
        "explanation_he": "המבנה Were it not for X מציין תנאי היפותטי: אלמלא הבצורת, היבולים היו עומדים ביעד. משמע: הבצורת היא שגרמה לירידה ביבולים אל מתחת לממוצע."
    },
    {
        "id": 24,
        "difficulty": "C_advanced",
        "grammar_target": "concession_degree",
        "source_sentence": "Invaluable though the mentor's counsel proved to be, the entrepreneur had to navigate the crisis through independent intuition.",
        "options": [
            {"text": "Even though the mentor provided extremely helpful guidance, the entrepreneur ultimately had to rely on her own instincts during the crisis.", "is_correct": True, "error_type": None},
            {"text": "Because the mentor offered poor advice, the entrepreneur faced an unavoidable business crisis.", "is_correct": False, "error_type": "poor_advice_error"},
            {"text": "The entrepreneur disregarded her mentor's advice because she trusted only analytical data.", "is_correct": False, "error_type": "disregard_fabrication"},
            {"text": "Without the mentor's valuable counsel, the entrepreneur would have abandoned the venture.", "is_correct": False, "error_type": "abandonment_shift"}
        ],
        "explanation_he": "המבנה Invaluable though X proved to be מעמיד תואר בראש המשפט ומבטא ויתור עמוק (Even though the guidance was extremely helpful)."
    },
    {
        "id": 25,
        "difficulty": "C_advanced",
        "grammar_target": "scarcity_restriction",
        "source_sentence": "Scarcely had the treaty been ratified when border skirmishes reignited lingering hostilities between the two states.",
        "options": [
            {"text": "Almost as soon as the agreement was formally approved, clashes along the frontier resumed long-standing conflicts.", "is_correct": True, "error_type": None},
            {"text": "The border skirmishes delayed the ratification of the peace treaty for several months.", "is_correct": False, "error_type": "chronology_reversal"},
            {"text": "Following years of fighting along the border, both states agreed to ratify a peaceful resolution.", "is_correct": False, "error_type": "peace_outcome_error"},
            {"text": "Hostilities ceased permanently once the treaty received final ratification from the states.", "is_correct": False, "error_type": "complete_opposite"}
        ],
        "explanation_he": "Scarcely... when מקביל ל-Almost as soon as (מיד עם אישור ההסכם, התחדשו הקרבות)."
    },
    {
        "id": 26,
        "difficulty": "C_advanced",
        "grammar_target": "counter_intuitive_balance",
        "source_sentence": "Notwithstanding the author's meticulous historical research, the novel's philosophical premise remains unconvincing to most literary critics.",
        "options": [
            {"text": "Despite the rigorous historical groundwork, the central philosophical argument failed to persuade the majority of reviewers.", "is_correct": True, "error_type": None},
            {"text": "Literary critics praised the novel's philosophical depth while questioning its historical accuracy.", "is_correct": False, "error_type": "evaluation_inversion"},
            {"text": "The author deliberately compromised historical facts in order to strengthen the novel's philosophical theme.", "is_correct": False, "error_type": "motive_fabrication"},
            {"text": "Most critics were convinced by the novel primarily because of its meticulous historical details.", "is_correct": False, "error_type": "opposite_conclusion"}
        ],
        "explanation_he": "Notwithstanding שקול ל-Despite (למרות המחקר המוקפד, הטיעון הפילוסופי לא שכנע את מרבית המבקרים)."
    },
    {
        "id": 27,
        "difficulty": "C_advanced",
        "grammar_target": "inversion_extent",
        "source_sentence": "Not only did the policy curb inflationary pressures, but it also stimulated significant technological innovation in domestic manufacturing.",
        "options": [
            {"text": "In addition to reducing inflation, the policy spurred meaningful technological advancements in local industry.", "is_correct": True, "error_type": None},
            {"text": "The policy managed to curb inflation, but it severely hindered technological growth in manufacturing.", "is_correct": False, "error_type": "contrast_distortion"},
            {"text": "Technological innovation in domestic manufacturing was necessary to keep inflation under control.", "is_correct": False, "error_type": "prerequisite_shift"},
            {"text": "Neither inflation nor industrial productivity was substantially influenced by the new policy.", "is_correct": False, "error_type": "double_negation_error"}
        ],
        "explanation_he": "Not only... but also מבטא הוספה מצטברת כפולה (בנוסף לבלימת האינפלציה, גם תמרץ חדשנות טכנולוגית)."
    },
    {
        "id": 28,
        "difficulty": "C_advanced",
        "grammar_target": "understatement_nuance",
        "source_sentence": "The spokesperson's statement was less an explanation of the policy shift than an overt attempt to deflect public criticism.",
        "options": [
            {"text": "Rather than genuinely clarifying why the policy changed, the spokesperson aimed primarily to divert public scrutiny.", "is_correct": True, "error_type": None},
            {"text": "The spokesperson thoroughly explained the policy change in order to welcome public constructive feedback.", "is_correct": False, "error_type": "welcome_error"},
            {"text": "Public criticism forced the spokesperson to cancel the scheduled policy announcement.", "is_correct": False, "error_type": "cancellation_shift"},
            {"text": "The policy was shifted solely because the spokesperson failed to defend it during the press conference.", "is_correct": False, "error_type": "post_hoc_fallacy"}
        ],
        "explanation_he": "המבנה less X than Y מעיד כי המעשה היה Y הרבה יותר מאשר X (היה זה ניסיון להסיט ביקורת יותר מאשר הסבר אמיתי למדיניות)."
    },
    {
        "id": 29,
        "difficulty": "C_advanced",
        "grammar_target": "limiting_qualification",
        "source_sentence": "The experiment confirmed the hypothesis only insofar as standard laboratory temperatures were maintained.",
        "options": [
            {"text": "The hypothesis proved valid exclusively under controlled, normal thermal conditions in the lab.", "is_correct": True, "error_type": None},
            {"text": "Extreme temperature fluctuations had no bearing on whether the hypothesis was validated.", "is_correct": False, "error_type": "no_effect_error"},
            {"text": "The experiment failed completely because laboratory temperatures could not be monitored.", "is_correct": False, "error_type": "failure_exaggeration"},
            {"text": "Scientists formulated the hypothesis only after examining abnormal laboratory temperature data.", "is_correct": False, "error_type": "timeline_shift"}
        ],
        "explanation_he": "הביטוי only insofar as מציב גבול תחולה מדויק: ההשערה אוששה אך ורק במידה וטמפרטורת המעבדה נשמרה בטווח התקני."
    },
    {
        "id": 30,
        "difficulty": "C_advanced",
        "grammar_target": "concession_superlative",
        "source_sentence": "However compelling the theoretical model appears on paper, empirical validation remains indispensable before clinical deployment.",
        "options": [
            {"text": "No matter how persuasive the theory is in principle, experimental testing is mandatory prior to medical use.", "is_correct": True, "error_type": None},
            {"text": "Because the theoretical model was so compelling, clinical deployment proceeded without empirical testing.", "is_correct": False, "error_type": "proceeded_error"},
            {"text": "Clinical trials proved that the theoretical model was fundamentally flawed from the outset.", "is_correct": False, "error_type": "flawed_presumption"},
            {"text": "Empirical validation was deemed unnecessary once the theoretical framework was published.", "is_correct": False, "error_type": "unnecessary_error"}
        ],
        "explanation_he": "המבנה However + Adjective + S + V שקול ל-No matter how persuasive (לא משנה עד כמה המודל משכנע בתאוריה, בדיקה מעשית נותרה הכרחית)."
    }
]

def main():
    out_dir = Path("data/imports")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "amiram_restatements.json"
    
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(RESTATEMENTS, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully generated {len(RESTATEMENTS)} Amiram Restatement questions in {out_file}")

if __name__ == "__main__":
    main()
