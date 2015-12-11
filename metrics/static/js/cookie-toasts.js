$(function() {
  /*
    Toast messages based on cookies
  */
  var Toast = {
    init: function() {
      try {
        var toast = document.cookie.split("toast=")[1].split(";")[0];

        switch(toast) {
          case 'new-action':
            $.toast({
              heading: 'Success',
              text: 'You have succesfully created a new segment!',
              position: 'bottom-right'
            })
            break;
        }

        Toast.forget();
      } catch(err) {
        console.log('No toast');
      }
    },

    forget: function() {
      document.cookie = 'toast=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
  };
  Toast.init();
});
