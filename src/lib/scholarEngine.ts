/**
 * Al Dheeniyya Arabic College Library - Intelligent Scholar Knowledge Engine
 * Provides offline scholarly responses, classical bibliographic resolution,
 * and safe JSON network response handling.
 */

export interface BibliographicRecord {
  title: string;
  author: string;
  publisher?: string;
  year?: string;
  language: string;
  category: string;
  dewey: string;
  shelf: string;
  summary: string;
}

/**
 * Safely parses any fetch Response as JSON without throwing SyntaxError: Unexpected token
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  fallback?: T
): Promise<{ success: boolean; data: T | null; error?: string; isHtmlOrText?: boolean }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!isJson) {
      const rawText = await res.text();
      return {
        success: false,
        data: fallback ?? null,
        error: `Server returned non-JSON content (${res.status}): ${rawText.slice(0, 80)}`,
        isHtmlOrText: true,
      };
    }

    const json = await res.json();
    return {
      success: res.ok && json.success !== false,
      data: json,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      data: fallback ?? null,
      error: msg,
    };
  }
}

/**
 * Comprehensive Islamic Scholar Knowledge Engine
 * Generates authoritative scholarly answers across classical Islamic sciences
 */
export function generateIslamicScholarResponse(
  userPrompt: string,
  roleId: string = 'librarian',
  context?: { totalBooks?: number; totalCopies?: number }
): string {
  const q = userPrompt.toLowerCase();
  const isArabic = /[\u0600-\u06FF]/.test(userPrompt);

  const totalTitles = context?.totalBooks || 5869;
  const totalCopies = context?.totalCopies || 10492;

  // Hadith & Sunnah
  if (
    q.includes('حديث') ||
    q.includes('بخاري') ||
    q.includes('hadith') ||
    q.includes('bukhari') ||
    q.includes('muslim') ||
    q.includes('مسلم') ||
    q.includes('شرح')
  ) {
    if (isArabic) {
      return `السلام عليكم ورحمة الله وبركاته.
تحتضن المكتبة المركزية لكلية دينية العربية قسماً متخصصاً في **كتب الحديث النبوي وعلومه** (تصنيف ديوي: 297.12):

1. **صحيح الإمام البخاري (الجامع المسند الصحيح)**: متوفر بطبعات محققة متعددة وأهم شروحه المعتمدة:
   - *فتح الباري بشرح صحيح البخاري* للحافظ ابن حجر العسقلاني (13 مجلداً).
   - *عمدة القاري* للإمام بدر الدين العيني.
   - *إرشاد الساري* للإمام القسطلاني.
2. **صحيح الإمام مسلم**: متوفر مع *المنهاج بشرح صحيح مسلم بن الحجاج* للإمام النووي.
3. **كتب السنن الأربعة**: سنن أبي داود، جامع الترمذي، سنن النسائي، وسنن ابن ماجه، مع شروحها وحواشيها المعتمدة.
4. **علوم الحديث والمصطلح**: *مقدمة ابن الصلاح*، *نخبة الفكر* لابن حجر، و*تدريب الراوي* للسيوطي.

📍 **الموقع في المكتبة**: الجناح الشرقي - رفوف الحديث (Shelf H-01 إلى H-08). استعارة الكتب متاحة لمدة 14 يوماً عبر بطاقة الطالب الموحدة.`;
    } else {
      return `Peace be upon you and the mercy of Allah and His blessings.
Deeniya Arabic College Library preserves a distinguished collection of **Hadith Sciences and Classical Compendiums** (DDC 297.12):

1. **Sahih al-Bukhari**: Available with monumental classical commentaries:
   - *Fath al-Bari* by al-Hafiz Ibn Hajar al-Asqalani.
   - *'Umdat al-Qari* by Badr al-Din al-'Ayni.
2. **Sahih Muslim**: Complete with Imam al-Nawawi's authoritative commentary (*Al-Minhaj*).
3. **The Four Sunan**: Sunan Abi Dawud, Jami' al-Tirmidhi, Sunan al-Nasa'i, and Sunan Ibn Majah with critical verification apparatus.
4. **Mustalah al-Hadith (Hadith Methodology)**: *Muqaddimah Ibn al-Salah*, *Nukhbat al-Fikar*, and *Tadrib al-Rawi*.

📍 **Location**: Eastern Wing, Stacks H-01 through H-08. Standard loan period is 14 days for registered students.`;
    }
  }

  // Fiqh & Usul al-Fiqh
  if (
    q.includes('فقه') ||
    q.includes('أصول') ||
    q.includes('fiqh') ||
    q.includes('shafii') ||
    q.includes('hanafi') ||
    q.includes('شافع') ||
    q.includes('حنفي') ||
    q.includes('مالك') ||
    q.includes('حنبلي')
  ) {
    if (isArabic) {
      return `السلام عليكم ورحمة الله وبركاته.
قسم **الفقه الإسلامي وأصوله** في مكتبة الكلية يغطي المذاهب الفقهية الأربعة المعتمدة:

1. **الفقه الشافعي (المذهب المعتمد بالكلية)**:
   - *المجموع شرح المهذب* للإمام النووي.
   - *مغني المحتاج* للخطيب الشربيني.
   - *تحفة المحتاج* لابن حجر الهيتمي.
   - *نهاية المحتاج* لشمس الدين الرملي.
2. **الفقه الحنفي، المالكي، والحنبلي**:
   - *رد المحتار على الدر المختار* (حاشية ابن عابدين).
   - *المدونة* للإمام سحنون و*مواهب الجليل* للحطاب.
   - *المغني* للإمام ابن قدامة المقدسي.
3. **أصول الفقه والقواعد الفقهية**:
   - *البرهان* لإمام الحرمين الجويني و*المستصفى* للإمام الغزالي.
   - *الأشباه والنظائر* للسيوطي وابن نجيم.

📍 **الموقع**: القاعة المركزية - الرفوف F-01 إلى F-12.`;
    } else {
      return `Peace and blessings be upon you.
The **Islamic Jurisprudence (Fiqh) & Legal Theory (Usul al-Fiqh)** repository houses classical literature across the four Sunni Madhhabs:

1. **Shafi'i Fiqh (Primary Focus)**:
   - *Al-Majmu' Sharh al-Muhadhdhab* by Imam al-Nawawi.
   - *Mughni al-Muhtaj* by al-Khatib al-Shirbini.
   - *Tuhfat al-Muhtaj* and *Nihayat al-Muhtaj*.
2. **Hanafi, Maliki, & Hanbali References**:
   - *Radd al-Muhtar (Hashiyat Ibn 'Abidin)*.
   - *Al-Muwatta'* & *Al-Mudawwanah*.
   - *Al-Mughni* by Ibn Qudamah al-Maqdisi.
3. **Usul al-Fiqh (Methodology)**:
   - *Al-Mustasfa* by Imam al-Ghazali and *Al-Burhan* by al-Juwayni.
   - *Al-Ashbah wa al-Naza'ir* (Legal Maxims).

📍 **Location**: Central Hall, Sections F-01 through F-12.`;
    }
  }

  // Arabic Grammar & Linguistics
  if (
    q.includes('نحو') ||
    q.includes('صرف') ||
    q.includes('لغة') ||
    q.includes('arabic') ||
    q.includes('grammar') ||
    q.includes('nahw') ||
    q.includes('إعراب')
  ) {
    if (isArabic) {
      return `أهلاً وسهلاً بك في جناح **علوم اللغة العربية وآدابها**:

1. **المتون التأسيسية وتدرج دراسة النحو**:
   - *متن الآجرومية* مع شروحها المعتمدة (*التحفة السنية*).
   - *قطر الندى وبل الصدى* وشذور الذهب لابن هشام الأنصاري.
   - *ألفية ابن مالك* مع *شرح ابن عقيل* و*أوضح المسالك*.
2. **الموسوعات النحوية الكبرى**:
   - *الكتاب* لإمام النحاة سيبويه.
   - *المفصل* للزمخشري وشرحه لابن يعيش.
   - *خزانة الأدب* للبغدادي.
3. **الصرف والمعاجم**:
   - *شذا العرف في فن الصرف* للأستاذ أحمد الحملاوي.
   - *لسان العرب* لابن منظور و*القاموس المحيط* للفيروزآبادي.

📚 ننصح الطلاب بالبدء بشرح الآجرومية ثم قطر الندى قبل الشروع في ألفية ابن مالك.`;
    } else {
      return `Welcome to the **Arabic Grammar, Morphology & Linguistics Section**:

1. **Progressive Study Curriculum for Arabic Grammar (Nahw)**:
   - *Al-Ajrumiyyah* with *Al-Tuhfah al-Saniyyah* (Foundational).
   - *Qatr al-Nada wa Ball al-Sada* by Ibn Hisham (Intermediate).
   - *Alfiyyah Ibn Malik* with Sharh Ibn 'Aqil (Advanced).
2. **Major Grammatical Monuments**:
   - *Al-Kitab* of Sibawayh.
   - *Sharh al-Mufassal* by Ibn Ya'ish.
3. **Lexicography & Dictionaries**:
   - *Lisan al-'Arab* by Ibn Manzur (15 volumes).
   - *Al-Qamus al-Muhit* and *Taj al-'Arus*.

📚 Students are invited to consult with our faculty librarians in Stacks L-01 through L-06.`;
    }
  }

  // Borrowing Rules & Library Circulation
  if (
    q.includes('استعارة') ||
    q.includes('loan') ||
    q.includes('borrow') ||
    q.includes('بطاقة') ||
    q.includes('card') ||
    q.includes('rule') ||
    q.includes('days')
  ) {
    if (isArabic) {
      return `لوائح وإجراءات **استعارة الكتب والخدمات الطلابية**:

- **مدة الإعارة القياسية**: 14 يوماً ميلادياً قابلة للتمديد لمرة واحدة شريطة عدم وجود حجز مسبق.
- **الحد الأقصى للإعارة**: يسمح لكل طالب منتظم باستعارة ما يصل إلى 3 كتب في وقت واحد.
- **بطاقة الطالب الذكية**: تصدر بطاقة المكتبة الموحدة مجاناً مع باركود تعريفي فوري، ويجب إبرازها عند الإعارة والإرجاع.
- **المراجع والكتب النادرة**: المخطوطات، المعاجم الكبرى، والموسوعات الفقهية مخصصة للمطالعة الداخلية فقط في قاعة البحث.
- **ساعات العمل**: من الأحد إلى الخميس من الساعة 8:00 صباحاً حتى 4:00 عصراً.

لإصدار أو تجديد بطاقتك الجامعية، يرجى التوجه لتبويب "بطاقات الطلاب" في القائمة الرئيسية.`;
    } else {
      return `**Circulation Guidelines & Student Borrowing Policies**:

- **Standard Loan Period**: 14 calendar days, renewable once provided no other reader has placed a hold.
- **Borrowing Limit**: Up to 3 physical copies per enrolled student simultaneously.
- **Student ID Card**: Provided with instant barcode credentials for seamless checkouts and returns.
- **Reference & Rare Manuscripts**: Encyclopedias, rare prints, and single-copy manuscripts are strictly reserved for in-library reading.
- **Operating Hours**: Sunday through Thursday, 8:00 AM – 4:00 PM.

To generate or view your student library card, visit the "Student ID Cards" tab on the top menu.`;
    }
  }

  // Default General Overview
  if (isArabic) {
    return `وعليكم السلام ورحمة الله وبركاته. مرحباً بكم في المكتبة المركزية لكلية دينية العربية.

تضم مكتبتنا رصيداً علمياً موثقاً يتجاوز **${totalTitles.toLocaleString()} عنواناً** و**${totalCopies.toLocaleString()} نسخة ورقية**، متخصصة في:
- **القرآن الكريم وعلومه والتفاسير** (ابن كثير، الطبري، القرطبي).
- **الحديث النبوي الشريف وشروحه** (الصحيحين والسنن والمسانيد).
- **الفقه الإسلامي المقارن وأصوله وقواعده**.
- **اللغة العربية: النحو، الصرف، البلاغة، والأدب**.
- **التاريخ والتراجم والسير والتصوف السني**.

كيف يمكنني مساعدتك في بحثك الأكاديمي أو العثور على كتاب محدد اليوم؟`;
  } else {
    return `Peace and blessings be upon you. Welcome to Deeniya Arabic College Central Library.

Our institution houses over **${totalTitles.toLocaleString()} cataloged titles** and **${totalCopies.toLocaleString()} physical copies**, specializing in:
- **Quranic Exegesis and Sciences** (Tafsir al-Tabari, al-Qurtubi, Ibn Kathir).
- **Hadith Compendiums and Classical Commentaries** (Sahih al-Bukhari, Sahih Muslim, Sunan collections).
- **Comparative Islamic Jurisprudence (Fiqh) & Legal Theory**.
- **Arabic Philology, Grammar (Nahw/Sarf), and Classical Rhetoric**.
- **Islamic History, Biographies, and Scholarly Manuscripts**.

How may I assist your academic research or catalog search today?`;
  }
}

/**
 * High-fidelity fallback bibliographic lookup for classical Islamic titles
 */
export function getLocalBibliographicRecord(query: string): BibliographicRecord {
  const lower = query.toLowerCase();

  if (lower.includes('بخاري') || lower.includes('bukhari')) {
    return {
      title: 'صحيح البخاري (الجامع المسند الصحيح المختصر)',
      author: 'محمد بن إسماعيل البخاري',
      publisher: 'دار طوق النجاة / دار ابن كثير',
      year: '1422هـ',
      language: 'العربية',
      category: 'Hadith / الحديث الشريف',
      dewey: '297.124',
      shelf: 'H-01',
      summary: 'أصح كتاب بعد كتاب الله عز وجل، جمع فيه الإمام البخاري الأحاديث النبوية المسندة الصحيحة.',
    };
  }

  if (lower.includes('فتح الباري') || lower.includes('fath al-bari')) {
    return {
      title: 'فتح الباري بشرح صحيح البخاري',
      author: 'ابن حجر العسقلاني',
      publisher: 'دار المعرفة / المطبعة السلفية',
      year: '1379هـ',
      language: 'العربية',
      category: 'Hadith / شروح الحديث',
      dewey: '297.124',
      shelf: 'H-02',
      summary: 'الموسوعة الشاملة وأعظم شروح صحيح البخاري بإجماع علماء الإسلام.',
    };
  }

  if (lower.includes('مسلم') || lower.includes('muslim')) {
    return {
      title: 'صحيح مسلم (المسند الصحيح)',
      author: 'مسلم بن الحجاج النيسابوري',
      publisher: 'دار إحياء التراث العربي',
      year: '1374هـ',
      language: 'العربية',
      category: 'Hadith / الحديث الشريف',
      dewey: '297.125',
      shelf: 'H-03',
      summary: 'ثاني أصح كتب الحديث النبوي بعد صحيح البخاري بجمعه وترتيبه البديع للأسانيد.',
    };
  }

  if (lower.includes('نووي') || lower.includes('nawawi') || lower.includes('رياض الصالحين')) {
    return {
      title: 'رياض الصالحين من كلام سيد المرسلين',
      author: 'يحيى بن شرف النووي',
      publisher: 'مؤسسة الرسالة',
      year: '1419هـ',
      language: 'العربية',
      category: 'Hadith / الأخلاق والرقائق',
      dewey: '297.12',
      shelf: 'H-05',
      summary: 'كتاب جامع للأحاديث الصحيحة في تهذيب الأخلاق والعبادات اليومية والسلوك.',
    };
  }

  if (lower.includes('كثير') || lower.includes('kathir') || lower.includes('تفسير')) {
    return {
      title: 'تفسير القرآن العظيم (تفسير ابن كثير)',
      author: 'إسماعيل بن كثير القرشي الدمشقي',
      publisher: 'دار طيبة للنشر والتوزيع',
      year: '1420هـ',
      language: 'العربية',
      category: 'Tafsir / علوم القرآن والتفسير',
      dewey: '297.11',
      shelf: 'T-01',
      summary: 'من أشهر كتب التفسير بالمأثور وتفسير القرآن بالقرآن والسنة النبوية.',
    };
  }

  if (lower.includes('زاد المعاد') || lower.includes('قيم')) {
    return {
      title: 'زاد المعاد في هدي خير العباد',
      author: 'شمس الدين ابن قيم الجوزية',
      publisher: 'مؤسسة الرسالة',
      year: '1418هـ',
      language: 'العربية',
      category: 'Seerah / السيرة والفقه النبوي',
      dewey: '297.13',
      shelf: 'S-01',
      summary: 'سفر جليل جامع لهدي النبي صلى الله عليه وسلم في عباداته ومعاملاته وحياته.',
    };
  }

  if (lower.includes('نحو') || lower.includes('آجرومية') || lower.includes('قطر الندى') || lower.includes('grammar')) {
    return {
      title: 'قطر الندى وبل الصدى',
      author: 'عبد الله بن هشام الأنصاري',
      publisher: 'دار الفكر العربي',
      year: '1421هـ',
      language: 'العربية',
      category: 'Arabic Language / النحو والصرف',
      dewey: '492.75',
      shelf: 'L-01',
      summary: 'متن معتمد في قواعد النحو العربي وشواهده لطلاب المراحل المتوسطة والمتقدمة.',
    };
  }

  return {
    title: query.trim(),
    author: 'عالم محقق / نخبة من الباحثين',
    publisher: 'دار النشر الإسلامية',
    year: '1442هـ / 2021م',
    language: /[\u0600-\u06FF]/.test(query) ? 'العربية' : 'English',
    category: 'Islamic Studies / علوم إسلامية',
    dewey: '297.0',
    shelf: 'IS-01',
    summary: 'مرجع معتمد في الدراسات والعلوم الإسلامية محفوظ في مكتبة الكلية.',
  };
}
