export const languageData = {
  'en-US': {
    card: {
      title: 'Title',
      genre: 'Genre',
      date: 'Release date',
      description: 'Description',
      link: 'Read more'
    },
    app: {
      h1: 'Select Language',
      home: 'home'
    }
  },
  'es-ES': {
    card: {
      title: 'Título',
      genre: 'Género',
      date: 'Estreno',
      description: 'Descripción',
      link: 'Lee mas'
    },
    app: {
      h1: 'Cambiar de idioma',
      home: 'casa'
    }
  },
  'ru-RU': {
    card: {
      title: 'Название',
      genre: 'Жанр',
      date: 'Дата премьеры',
      description: 'Описание',
      link: 'Читать подробно'
    },
    app: {
      h1: 'Изменить язык',
      home: 'дома'
    }
  }
};

export const resolveLanguageData = (language: string) =>
  languageData[language] || languageData['en-US'];
